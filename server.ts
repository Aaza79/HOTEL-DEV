import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';

const PORT = 3000;
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const db = new Database('hotel_attendance.db');

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS metadata (
    hotel TEXT,
    departamento TEXT,
    año INTEGER,
    mes INTEGER,
    ultimaModificacion TEXT,
    isLocked INTEGER DEFAULT NULL,
    PRIMARY KEY (hotel, departamento, año, mes)
  );
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    hotel TEXT,
    departamento TEXT,
    nombre TEXT,
    fechaAlta TEXT,
    fechaBaja TEXT,
    trial_active INTEGER,
    trial_dias INTEGER,
    trial_fechaFin TEXT
  );
  CREATE TABLE IF NOT EXISTS attendance (
    employee_id TEXT,
    año INTEGER,
    mes INTEGER,
    dia INTEGER,
    code TEXT,
    horas_extras REAL,
    PRIMARY KEY (employee_id, año, mes, dia)
  );
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT,
    role TEXT,
    allowedDepartments TEXT
  );
  CREATE TABLE IF NOT EXISTS holidays (
    date TEXT PRIMARY KEY,
    name TEXT
  );
`);

// Add default admin if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  db.prepare('INSERT INTO users (username, password, role, allowedDepartments) VALUES (?, ?, ?, ?)').run('admin', '1579@Chemas', 'admin', '["ALL"]');
} else {
  // Update password if it's the old default
  const adminUser = adminExists as any;
  if (adminUser.password === 'admin123') {
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run('1579@Chemas', 'admin');
  }
}

// HTTP Server
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // We can handle specific messages here if needed
  });
});

const broadcastUpdate = (type: string, payload?: any) => {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(msg);
    }
  });
};

// --- API Routes ---

// Users
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT username, role, allowedDepartments FROM users').all();
  res.json(users.map((u: any) => ({ ...u, allowedDepartments: JSON.parse(u.allowedDepartments) })));
});

app.post('/api/users', (req, res) => {
  const { user, password } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(user.username);
  if (existing) {
    if (password) {
      db.prepare('UPDATE users SET password = ?, role = ?, allowedDepartments = ? WHERE username = ?')
        .run(password, user.role, JSON.stringify(user.allowedDepartments), user.username);
    } else {
      db.prepare('UPDATE users SET role = ?, allowedDepartments = ? WHERE username = ?')
        .run(user.role, JSON.stringify(user.allowedDepartments), user.username);
    }
  } else {
    db.prepare('INSERT INTO users (username, password, role, allowedDepartments) VALUES (?, ?, ?, ?)')
      .run(user.username, password || '', user.role, JSON.stringify(user.allowedDepartments));
  }
  broadcastUpdate('USERS_CHANGED');
  res.json({ success: true });
});

app.delete('/api/users/:username', (req, res) => {
  db.prepare('DELETE FROM users WHERE username = ?').run(req.params.username);
  broadcastUpdate('USERS_CHANGED');
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (user) {
    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        allowedDepartments: JSON.parse(user.allowedDepartments)
      }
    });
  } else {
    res.json({ success: false });
  }
});

// Holidays
app.get('/api/holidays', (req, res) => {
  const { year } = req.query;
  let holidays;
  if (year) {
    holidays = db.prepare('SELECT * FROM holidays WHERE date LIKE ? ORDER BY date ASC').all(`${year}-%`);
  } else {
    holidays = db.prepare('SELECT * FROM holidays ORDER BY date ASC').all();
  }
  res.json(holidays);
});

app.post('/api/holidays', (req, res) => {
  const { date, name } = req.body;
  db.prepare('INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)').run(date, name);
  broadcastUpdate('HOLIDAYS_CHANGED');
  res.json({ success: true });
});

app.delete('/api/holidays/:date', (req, res) => {
  db.prepare('DELETE FROM holidays WHERE date = ?').run(req.params.date);
  broadcastUpdate('HOLIDAYS_CHANGED');
  res.json({ success: true });
});

// Months and Locks
app.get('/api/months', (req, res) => {
  const months = db.prepare('SELECT hotel, departamento, año, mes, isLocked FROM metadata ORDER BY año DESC, mes DESC').all();
  res.json(months.map((m: any) => ({ ...m, isLocked: m.isLocked === 1 })));
});

app.post('/api/months/lock', (req, res) => {
  const { hotel, departamento, año, mes, isLocked } = req.body;
  db.prepare('UPDATE metadata SET isLocked = ? WHERE hotel = ? AND departamento = ? AND año = ? AND mes = ?')
    .run(isLocked ? 1 : 0, hotel, departamento, año, mes);
  broadcastUpdate('MONTHS_CHANGED');
  res.json({ success: true });
});

// Data Deletion
app.delete('/api/data/year/:year', (req, res) => {
  const year = req.params.year;
  db.prepare('DELETE FROM metadata WHERE año = ?').run(year);
  db.prepare('DELETE FROM attendance WHERE año = ?').run(year);
  db.prepare('DELETE FROM holidays WHERE date LIKE ?').run(`${year}-%`);
  broadcastUpdate('DATA_CHANGED');
  res.json({ success: true });
});

// App Data (Quadrant)
app.get('/api/appdata', (req, res) => {
  const { hotel, dept, year, month } = req.query;
  
  const metadata: any = db.prepare('SELECT * FROM metadata WHERE hotel = ? AND departamento = ? AND año = ? AND mes = ?')
    .get(hotel, dept, year, month);
    
  if (!metadata) {
    res.json(null);
    return;
  }
  
  const employees = db.prepare('SELECT * FROM employees WHERE hotel = ? AND departamento = ?').all(hotel, dept);
  
  const resultEmployees = employees.map((emp: any) => {
    const attendance = db.prepare('SELECT dia, code, horas_extras FROM attendance WHERE employee_id = ? AND año = ? AND mes = ?')
      .all(emp.id, year, month);
      
    const asistencia: any = {};
    const horasExtras: any = {};
    
    attendance.forEach((att: any) => {
      if (att.code) asistencia[att.dia] = att.code;
      if (att.horas_extras) horasExtras[att.dia] = att.horas_extras;
    });
    
    return {
      id: emp.id,
      nombre: emp.nombre,
      fechaAlta: emp.fechaAlta,
      fechaBaja: emp.fechaBaja,
      periodoPrueba: {
        activo: emp.trial_active === 1,
        dias: emp.trial_dias,
        fechaFin: emp.trial_fechaFin
      },
      asistencia,
      horasExtras
    };
  });
  
  res.json({
    metadata: {
      hotel: metadata.hotel,
      departamento: metadata.departamento,
      año: metadata.año,
      mes: metadata.mes,
      ultimaModificacion: metadata.ultimaModificacion,
      isLocked: metadata.isLocked === 1
    },
    empleados: resultEmployees
  });
});

app.post('/api/appdata', (req, res) => {
  const data = req.body;
  const { hotel, departamento, año, mes, ultimaModificacion, isLocked } = data.metadata;
  
  const insertMeta = db.prepare('INSERT OR REPLACE INTO metadata (hotel, departamento, año, mes, ultimaModificacion, isLocked) VALUES (?, ?, ?, ?, ?, ?)');
  insertMeta.run(hotel, departamento, año, mes, ultimaModificacion, isLocked ? 1 : 0);
  
  const insertEmp = db.prepare('INSERT OR REPLACE INTO employees (id, hotel, departamento, nombre, fechaAlta, fechaBaja, trial_active, trial_dias, trial_fechaFin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertAtt = db.prepare('INSERT OR REPLACE INTO attendance (employee_id, año, mes, dia, code, horas_extras) VALUES (?, ?, ?, ?, ?, ?)');
  const deleteAtt = db.prepare('DELETE FROM attendance WHERE employee_id = ? AND año = ? AND mes = ?');
  
  const transaction = db.transaction(() => {
    for (const emp of data.empleados) {
      insertEmp.run(
        emp.id, hotel, departamento, emp.nombre, emp.fechaAlta, emp.fechaBaja,
        emp.periodoPrueba?.activo ? 1 : 0,
        emp.periodoPrueba?.dias || 60,
        emp.periodoPrueba?.fechaFin || null
      );
      
      deleteAtt.run(emp.id, año, mes);
      
      const days = new Set([...Object.keys(emp.asistencia || {}), ...Object.keys(emp.horasExtras || {})]);
      for (const dayStr of days) {
        const day = parseInt(dayStr);
        const code = emp.asistencia?.[day] || null;
        const he = emp.horasExtras?.[day] || null;
        if (code || he) {
          insertAtt.run(emp.id, año, mes, day, code, he);
        }
      }
    }
  });
  
  transaction();
  
  // Broadcast to other clients that data for this specific quadrant changed
  broadcastUpdate('APPDATA_CHANGED', { hotel, departamento, año, mes });
  res.json({ success: true });
});

app.get('/api/employees/recent', (req, res) => {
  const { hotel, dept } = req.query;
  const employees = db.prepare('SELECT * FROM employees WHERE hotel = ? AND departamento = ?').all(hotel, dept);
  
  const result = employees.map((emp: any) => ({
    id: emp.id,
    nombre: emp.nombre,
    fechaAlta: emp.fechaAlta,
    fechaBaja: emp.fechaBaja,
    periodoPrueba: {
      activo: emp.trial_active === 1,
      dias: emp.trial_dias,
      fechaFin: emp.trial_fechaFin
    },
    asistencia: {},
    horasExtras: {}
  }));
  
  res.json(result);
});

app.get('/api/employees/:id/attendance', (req, res) => {
  const { id } = req.params;
  const { year } = req.query;
  const attendance = db.prepare('SELECT mes, dia, code FROM attendance WHERE employee_id = ? AND año = ?').all(id, year);
  res.json(attendance);
});

app.post('/api/employees/sync', (req, res) => {
  const emp = req.body;
  db.prepare('UPDATE employees SET nombre = ?, fechaAlta = ?, fechaBaja = ?, trial_active = ?, trial_dias = ?, trial_fechaFin = ? WHERE id = ?')
    .run(
      emp.nombre, emp.fechaAlta, emp.fechaBaja,
      emp.periodoPrueba?.activo ? 1 : 0,
      emp.periodoPrueba?.dias || 60,
      emp.periodoPrueba?.fechaFin || null,
      emp.id
    );
  broadcastUpdate('APPDATA_CHANGED', { hotel: '', departamento: '', año: -1, mes: -1 }); // Trigger global reload
  res.json({ success: true });
});

app.delete('/api/employees/:id/sync', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  db.prepare('DELETE FROM attendance WHERE employee_id = ?').run(id);
  broadcastUpdate('APPDATA_CHANGED', { hotel: '', departamento: '', año: -1, mes: -1 }); // Trigger reload
  res.json({ success: true });
});

app.get('/api/appdata/previous', (req, res) => {
  const { hotel, dept, year, month } = req.query;
  const y = parseInt(year as string);
  const m = parseInt(month as string);
  
  let prevMonth = m - 1;
  let prevYear = y;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear--;
  }
  
  const metadata = db.prepare('SELECT * FROM metadata WHERE hotel = ? AND departamento = ? AND año = ? AND mes = ?')
    .get(hotel, dept, prevYear, prevMonth);
    
  if (!metadata) {
    res.json(null);
    return;
  }
  
  const employees = db.prepare('SELECT * FROM employees WHERE hotel = ? AND departamento = ?').all(hotel, dept);
  
  const resultEmployees = employees.map((emp: any) => {
    const attendance = db.prepare('SELECT dia, code, horas_extras FROM attendance WHERE employee_id = ? AND año = ? AND mes = ?')
      .all(emp.id, prevYear, prevMonth);
      
    const asistencia: any = {};
    const horasExtras: any = {};
    
    attendance.forEach((att: any) => {
      if (att.code) asistencia[att.dia] = att.code;
      if (att.horas_extras) horasExtras[att.dia] = att.horas_extras;
    });
    
    return {
      id: emp.id,
      nombre: emp.nombre,
      fechaAlta: emp.fechaAlta,
      fechaBaja: emp.fechaBaja,
      periodoPrueba: {
        activo: emp.trial_active === 1,
        dias: emp.trial_dias,
        fechaFin: emp.trial_fechaFin
      },
      asistencia,
      horasExtras
    };
  });
  
  res.json({
    metadata: {
      hotel: metadata.hotel,
      departamento: metadata.departamento,
      año: metadata.año,
      mes: metadata.mes,
      ultimaModificacion: metadata.ultimaModificacion,
      isLocked: metadata.isLocked === 1
    },
    empleados: resultEmployees
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
