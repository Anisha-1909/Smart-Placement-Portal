/**
 * Application Main Controller
 */

// Utility: Show Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility: Format Date
function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Core App State & Routing
const app = {
    currentUser: null,
    
    init() {
        // Build initial session
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            this.routeUser();
        } else {
            this.navigate('home');
            this.updateNavbar();
        }

        // Setup role selector behavior in Login (Admin hint removed for security)
        document.getElementById('login-role').addEventListener('change', (e) => {
            // Nothing needed here currently
        });
    },

    navigate(viewId) {
        if (viewId === 'home' || viewId === 'auth') {
            document.body.classList.add('bg-image');
        } else {
            document.body.classList.remove('bg-image');
        }
        
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        // Show target view
        document.getElementById(`view-${viewId}`).classList.add('active');
        this.updateNavbar();
    },

    routeUser() {
        if (!this.currentUser) {
            this.navigate('home');
            return;
        }
        // Navigate to appropriate dashboard
        this.navigate(this.currentUser.role);
        
        // Initialize specific dashboard data
        if (this.currentUser.role === 'student') studentUI.init();
        if (this.currentUser.role === 'company') companyUI.init();
        if (this.currentUser.role === 'admin') adminUI.init();
    },

    login(user) {
        if (user.status !== 'active') {
            showToast("Your account has been blocked or is inactive.");
            return;
        }
        this.currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        this.routeUser();
        showToast(`Welcome back, ${user.name}!`);
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        this.navigate('home');
        showToast("Logged out successfully.");
    },

    updateNavbar() {
        const nav = document.getElementById('nav-links');
        nav.innerHTML = '';

        if (!this.currentUser) {
            nav.innerHTML = `
                <li><a onclick="app.navigate('home')">Home</a></li>
                <li><button class="btn btn-primary" onclick="app.navigate('auth')">Login / Join</button></li>
            `;
        } else {
            nav.innerHTML = `
                <li><a onclick="app.routeUser()">Dashboard</a></li>
                <li><button class="btn btn-outline" onclick="app.logout()">Logout</button></li>
            `;
        }
    }
};

// Auth UI Controller
const authUI = {
    switchTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById(`form-${tab}`).classList.add('active');
    },

    handleRegisterRoleChange() {
        const role = document.getElementById('register-role').value;
        document.getElementById('register-name-label').textContent = role === 'company' ? 'Company Name' : 'Full Name';
    },

    handleLogin(e) {
        e.preventDefault();
        const role = document.getElementById('login-role').value.trim().toLowerCase();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value.trim();

        const users = api.getUsers();
        console.log("Current Users in DB:", users);

        const user = users.find(u => 
            u.email.toLowerCase() === email && 
            u.password === pass && 
            u.role.toLowerCase() === role
        );

        if (user) {
            app.login(user);
        } else {
            showToast('Invalid credentials or role mismatch.');
        }
    },

    handleRegister(e) {
        e.preventDefault();
        const role = document.getElementById('register-role').value;
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const pass = document.getElementById('register-password').value;

        if (api.getUserByEmail(email)) {
            showToast('Email already in use.');
            return;
        }

        const newUser = { name, email, password: pass, role };
        if (role === 'student') {
            newUser.profile = { techSkills: '', softSkills: '', aptitude: 'Beginner', languages: '', interest: '', resume: '' };
        }
        
        api.createUser(newUser);
        showToast('Registration successful! Please login.');
        this.switchTab('login');
        document.getElementById('login-email').value = email;
    }
};


// Student UI Controller
const studentUI = {
    init() {
        const user = app.currentUser;
        document.getElementById('student-name-display').textContent = user.name;
        document.getElementById('student-email-display').textContent = user.email;
        document.getElementById('student-avatar').textContent = user.name.charAt(0).toUpperCase();
        
        // Load profile form
        if(user.profile) {
            document.getElementById('student-tech-skills').value = user.profile.techSkills || '';
            document.getElementById('student-soft-skills').value = user.profile.softSkills || '';
            document.getElementById('student-aptitude').value = user.profile.aptitude || 'Beginner';
            document.getElementById('student-languages').value = user.profile.languages || '';
            document.getElementById('student-interest').value = user.profile.interest || '';
            document.getElementById('student-resume').value = user.profile.resume || '';
        }

        this.showSection('jobs');
    },

    showSection(sec) {
        document.querySelectorAll('#view-student .dashboard-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('#view-student .side-nav-btn').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`student-sec-${sec}`).classList.add('active');
        event && event.target && event.target.tagName === 'BUTTON' ? event.target.classList.add('active') : null;

        if (sec === 'jobs') this.loadJobs();
        if (sec === 'recommended-jobs') this.loadRecommendedJobs();
        if (sec === 'applications') this.loadApplications();
    },

    saveProfile(e) {
        e.preventDefault();
        const profile = {
            techSkills: document.getElementById('student-tech-skills').value,
            softSkills: document.getElementById('student-soft-skills').value,
            aptitude: document.getElementById('student-aptitude').value,
            languages: document.getElementById('student-languages').value,
            interest: document.getElementById('student-interest').value,
            resume: document.getElementById('student-resume').value,
        };
        api.updateUser(app.currentUser.id, { profile });
        app.currentUser.profile = profile; // update local ref
        showToast("Profile updated!");
    },

    loadJobs() {
        const container = document.getElementById('student-jobs-container');
        const jobs = api.getJobs();
        container.innerHTML = jobs.map(j => `
            <div class="job-card">
                <div class="job-header">
                    <div>
                        <div class="job-title">${j.title}</div>
                        <div class="job-company">${j.companyName}</div>
                    </div>
                </div>
                <div class="job-meta">
                    <span>📍 ${j.location}</span>
                    <span>💰 ${j.salary || 'Not specified'}</span>
                </div>
                <div class="job-desc">${j.desc}</div>
                <div class="job-footer">
                    <span style="font-size:0.8rem; color:var(--text-light)">${formatDate(j.date)}</span>
                    <button class="btn btn-sm btn-primary" onclick="studentUI.applyJob('${j.id}')">Apply Now</button>
                </div>
            </div>
        `).join('') || '<p>No jobs available yet.</p>';
    },

    loadRecommendedJobs() {
        const container = document.getElementById('student-recommended-jobs-container');
        const jobs = api.getJobs();
        const profile = app.currentUser.profile || {};
        
        let studentSkills = [];
        if (profile.techSkills) studentSkills.push(...profile.techSkills.split(',').map(s => s.trim().toLowerCase()));
        if (profile.softSkills) studentSkills.push(...profile.softSkills.split(',').map(s => s.trim().toLowerCase()));
        
        const scoredJobs = jobs.map(j => {
            const reqSkills = (j.reqSkills || j.desc).split(',').map(s => s.trim().toLowerCase());
            let matchCount = 0;
            let matchedTags = [];
            
            reqSkills.forEach(skill => {
                if(studentSkills.some(s => s.includes(skill) || skill.includes(s))) {
                    matchCount++;
                    matchedTags.push(skill);
                }
            });
            
            const matchPercentage = reqSkills.length > 0 ? Math.round((matchCount / reqSkills.length) * 100) : 0;
            return { ...j, matchPercentage, matchedTags };
        });

        // Filter out zero match jobs, sort descending
        const recommended = scoredJobs.filter(j => j.matchPercentage > 0).sort((a,b) => b.matchPercentage - a.matchPercentage);

        container.innerHTML = recommended.map(j => {
            let badgeClass = 'match-low';
            if(j.matchPercentage >= 75) badgeClass = 'match-high';
            else if(j.matchPercentage >= 50) badgeClass = 'match-medium';

            const reason = "You match this job because you have " + j.matchedTags.join(', ') + " skills.";

            return `
            <div class="job-card" style="border: 1px solid var(--primary);">
                <div class="job-header">
                    <div>
                        <div class="job-title">${j.title}</div>
                        <div class="job-company">${j.companyName}</div>
                    </div>
                    <span class="match-badge ${badgeClass}">${j.matchPercentage}% Match</span>
                </div>
                <div class="match-reason">${reason}</div>
                <div class="job-meta">
                    <span>📍 ${j.location}</span>
                </div>
                <div class="job-desc">${j.desc}</div>
                <div class="job-footer">
                    <span style="font-size:0.8rem; color:var(--text-light)">${formatDate(j.date)}</span>
                    <button class="btn btn-sm btn-primary" onclick="studentUI.applyJob('${j.id}')">Apply Now</button>
                </div>
            </div>
            `;
        }).join('') || '<p>No specific job recommendations yet. Complete your profile with relevant technical skills!</p>';
    },

    applyJob(jobId) {
        if(api.applyForJob(jobId, app.currentUser.id)) {
            showToast("Application submitted successfully!");
        } else {
            showToast("You have already applied for this job.");
        }
    },

    loadApplications() {
        const tbody = document.getElementById('student-applications-tbody');
        const apps = api.getApplications().filter(a => a.studentId === app.currentUser.id);
        const jobs = api.getJobs();
        
        tbody.innerHTML = apps.map(a => {
            const job = jobs.find(j => j.id === a.jobId);
            if(!job) return ''; // job was deleted
            return `
                <tr>
                    <td>${job.companyName}</td>
                    <td>${job.title}</td>
                    <td>${formatDate(a.date)}</td>
                    <td><span class="status-badge status-${a.status}">${a.status}</span></td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="4">No applications found.</td></tr>';
    }
};

// Company UI Controller
const companyUI = {
    init() {
        const user = app.currentUser;
        document.getElementById('company-name-display').textContent = user.name;
        document.getElementById('company-email-display').textContent = user.email;
        document.getElementById('company-avatar').textContent = user.name.charAt(0).toUpperCase();
        this.showSection('my-jobs');
    },

    showSection(sec) {
        document.querySelectorAll('#view-company .dashboard-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('#view-company .side-nav-btn').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`company-sec-${sec}`).classList.add('active');
        event && event.target && event.target.tagName === 'BUTTON' ? event.target.classList.add('active') : null;

        if (sec === 'my-jobs') this.loadMyJobs();
        if (sec === 'applicants') this.loadApplicants();
    },

    postJob(e) {
        e.preventDefault();
        const job = {
            companyId: app.currentUser.id,
            companyName: app.currentUser.name,
            title: document.getElementById('job-title').value,
            location: document.getElementById('job-location').value,
            salary: document.getElementById('job-salary').value,
            reqSkills: document.getElementById('job-req-skills').value,
            eligibility: document.getElementById('job-eligibility').value,
            desc: document.getElementById('job-desc').value
        };
        api.createJob(job);
        showToast("Job posted successfully!");
        e.target.reset();
        this.showSection('my-jobs');
    },

    loadMyJobs() {
        const container = document.getElementById('company-jobs-container');
        const jobs = api.getJobsByCompany(app.currentUser.id);
        
        container.innerHTML = jobs.map(j => `
            <div class="job-card">
                <div class="job-header">
                    <div class="job-title">${j.title}</div>
                    <button class="btn btn-sm btn-danger" onclick="companyUI.deleteJob('${j.id}')">Delete</button>
                </div>
                <div class="job-meta">
                    <span>📍 ${j.location}</span>
                </div>
                <div class="job-desc">${j.desc}</div>
                <div class="job-footer">
                    <span style="font-size:0.8rem; color:var(--text-light)">Posted: ${formatDate(j.date)}</span>
                </div>
            </div>
        `).join('') || '<p>You have not posted any jobs yet.</p>';
    },

    deleteJob(jobId) {
        if(confirm('Are you sure you want to delete this job?')) {
            api.deleteJob(jobId);
            showToast('Job deleted.');
            this.loadMyJobs();
        }
    },

    loadApplicants() {
        const tbody = document.getElementById('company-applicants-tbody');
        const myJobs = api.getJobsByCompany(app.currentUser.id).map(j => j.id);
        const apps = api.getApplications().filter(a => myJobs.includes(a.jobId));
        const allUsers = api.getUsers();
        const allJobs = api.getJobs();

        tbody.innerHTML = apps.map(a => {
            const student = allUsers.find(u => u.id === a.studentId);
            const job = allJobs.find(j => j.id === a.jobId);
            if(!student || !job) return '';
            
            const prof = student.profile || {};
            const details = `${prof.dept || 'N/A'} | CGPA: ${prof.cgpa || 'N/A'} <br>
                             <small>${prof.skills || ''}</small>`;

            return `
                <tr>
                    <td><strong>${student.name}</strong><br><small>${student.email}</small></td>
                    <td>${job.title}</td>
                    <td>${details}</td>
                    <td><span class="status-badge status-${a.status}">${a.status}</span></td>
                    <td>
                        ${a.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="companyUI.updateApp('${a.id}', 'accepted')">Approve</button>
                            <button class="btn btn-sm btn-danger" onclick="companyUI.updateApp('${a.id}', 'rejected')">Reject</button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="5">No applicants yet.</td></tr>';
    },

    updateApp(appId, status) {
        api.updateApplicationStatus(appId, status);
        showToast(`Application ${status}`);
        this.loadApplicants();
    }
};

// Admin UI Controller
const adminUI = {
    init() {
        this.loadStats();
        this.loadUsers();
        this.loadJobs();
    },

    loadStats() {
        const users = api.getUsers();
        document.getElementById('stat-students').textContent = users.filter(u => u.role === 'student').length;
        document.getElementById('stat-companies').textContent = users.filter(u => u.role === 'company').length;
        document.getElementById('stat-jobs').textContent = api.getJobs().length;
        document.getElementById('stat-apps').textContent = api.getApplications().length;
    },

    loadUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        const users = api.getUsers().filter(u => u.role !== 'admin');
        
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span style="text-transform:capitalize;">${u.role}</span></td>
                <td><span class="status-badge status-${u.status}">${u.status}</span></td>
                <td>
                    ${u.status === 'active' ? 
                        `<button class="btn btn-sm btn-outline" onclick="adminUI.toggleUserStatus('${u.id}', 'blocked')">Block</button>` : 
                        `<button class="btn btn-sm btn-success" onclick="adminUI.toggleUserStatus('${u.id}', 'active')">Unblock</button>`
                    }
                    <button class="btn btn-sm btn-danger" onclick="adminUI.deleteUser('${u.id}')">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5">No active users.</td></tr>';
    },

    toggleUserStatus(userId, status) {
        api.updateUser(userId, { status });
        showToast(`User status updated to ${status}`);
        this.init();
    },

    deleteUser(userId) {
        if(confirm('Are you sure you want to completely delete this user and all associated records?')) {
            api.deleteUser(userId);
            showToast('User deleted successfully.');
            this.init();
        }
    },

    loadJobs() {
        const tbody = document.getElementById('admin-jobs-tbody');
        const jobs = api.getJobs();
        
        tbody.innerHTML = jobs.map(j => `
            <tr>
                <td>${j.companyName}</td>
                <td>${j.title}</td>
                <td>${formatDate(j.date)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="adminUI.deleteJob('${j.id}')">Delete Post</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="4">No jobs posted.</td></tr>';
    },

    deleteJob(jobId) {
        if(confirm('Are you sure you want to remove this job posting?')) {
            api.deleteJob(jobId);
            showToast('Job deleted successfully.');
            this.init();
        }
    }
};

// Initial Start
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
