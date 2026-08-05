/**
 * LocalStorage Data Management
 */

const DB_KEY = 'portal_db';

// Initialize DB
function initDB() {
    let db = JSON.parse(localStorage.getItem(DB_KEY));
    if (!db) {
        db = { users: [], jobs: [], applications: [] };
    }
    
    // Ensure admin exists
    let admin = db.users.find(u => u.role.toLowerCase() === 'admin');
    if (!admin) {
        db.users.push({
            id: 'u1',
            name: 'System Admin',
            email: 'admin@portal.com',
            password: 'admin123',
            role: 'admin',
            status: 'active'
        });
    } else {
        // Hotfix: Force update existing admin credentials incase User had stale local storage
        admin.password = 'admin123';
        admin.email = 'admin@portal.com';
    }
    
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Get entire DB
function getDB() {
    return JSON.parse(localStorage.getItem(DB_KEY)) || { users: [], jobs: [], applications: [] };
}

// Save entire DB
function saveDB(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
}

// Helper: Generate ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// APIs
const api = {
    // Users
    getUsers: () => getDB().users,
    getUserByEmail: (email) => getDB().users.find(u => u.email === email),
    getUserById: (id) => getDB().users.find(u => u.id === id),
    createUser: (userObj) => {
        const db = getDB();
        userObj.id = generateId();
        userObj.status = 'active';
        db.users.push(userObj);
        saveDB(db);
        return userObj;
    },
    updateUser: (id, updates) => {
        const db = getDB();
        const index = db.users.findIndex(u => u.id === id);
        if(index !== -1) {
            db.users[index] = { ...db.users[index], ...updates };
            saveDB(db);
            // update session if it's the current user
            const session = JSON.parse(sessionStorage.getItem('currentUser'));
            if(session && session.id === id) {
                sessionStorage.setItem('currentUser', JSON.stringify(db.users[index]));
            }
        }
    },
    deleteUser: (userId) => {
        const db = getDB();
        db.users = db.users.filter(u => u.id !== userId);
        // Clean up related jobs and apps if user was a company or student
        db.jobs = db.jobs.filter(j => j.companyId !== userId);
        db.applications = db.applications.filter(a => a.studentId !== userId);
        saveDB(db);
    },

    // Jobs
    getJobs: () => getDB().jobs,
    getJobsByCompany: (companyId) => getDB().jobs.filter(j => j.companyId === companyId),
    createJob: (jobObj) => {
        const db = getDB();
        jobObj.id = generateId();
        jobObj.date = new Date().toISOString();
        db.jobs.push(jobObj);
        saveDB(db);
        return jobObj;
    },
    deleteJob: (jobId) => {
        const db = getDB();
        db.jobs = db.jobs.filter(j => j.id !== jobId);
        // Also delete related apps
        db.applications = db.applications.filter(a => a.jobId !== jobId);
        saveDB(db);
    },

    // Applications
    getApplications: () => getDB().applications,
    applyForJob: (jobId, studentId) => {
        const db = getDB();
        // Check if already applied
        if (db.applications.some(a => a.jobId === jobId && a.studentId === studentId)) {
            return false;
        }
        db.applications.push({
            id: generateId(),
            jobId,
            studentId,
            status: 'pending',
            date: new Date().toISOString()
        });
        saveDB(db);
        return true;
    },
    updateApplicationStatus: (appId, status) => {
        const db = getDB();
        const app = db.applications.find(a => a.id === appId);
        if(app) {
            app.status = status;
            saveDB(db);
        }
    }
};

// Ensure initialization on script load
initDB();
