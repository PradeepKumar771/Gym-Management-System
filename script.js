// script.js - Final Version with Token Refresh Fix & Auth Flow Refactor

// --- DOM REFERENCES ---
const homePage = document.getElementById('home-page');
const adminLoginModule = document.getElementById('admin-login-module');
const memberLoginModule = document.getElementById('member-login-module');
const userLoginModule = document.getElementById('user-login-module');
const adminDashboard = document.getElementById('admin-dashboard');
const memberDashboard = document.getElementById('member-dashboard');

const adminLoginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const addMemberForm = document.getElementById('add-member-form');
const memberStatus = document.getElementById('member-status');

const memberList = document.getElementById('member-list');
const exportMembersBtn = document.getElementById('export-members-btn');
const membersDataTableBody = document.querySelector('#members-data-table tbody');

const billMemberSelect = document.getElementById('bill-member-select');
const billAmountInput = document.getElementById('bill-amount');
const createBillForm = document.getElementById('create-bill-form');
const billStatus = document.getElementById('bill-status');

const assignNotificationForm = document.getElementById('assign-notification-form');
const notificationStatus = document.getElementById('notification-status');
const activeAnnouncementsList = document.getElementById('active-announcements-list');

const memberLoginForm = document.getElementById('member-login-form');
const memberLoginError = document.getElementById('member-login-error');
const memberLogoutBtn = document.getElementById('member-logout-btn');
const memberNameDisplay = document.getElementById('member-name-display');
const memberPackageDisplay = document.getElementById('member-package-display');

const receiptList = document.getElementById('receipt-list');
const memberNotificationList = document.getElementById('member-notification-list');

const headerLoginBtn = document.getElementById('header-login-btn');
const loginDropdownMenu = document.getElementById('login-dropdown-menu');

// --- GLOBAL STATE & CONSTANTS ---
let allMembers = {};
let currentMemberDocId = null;
let isAdminAuthenticated = false; 
let isMemberAuthenticated = false; 
let currentAdminCredentials = { email: null, password: null }; 

// --- HELPER FUNCTION: Check Admin Status ---
async function checkAdminStatus(uid) {
    if (!uid) return false;
    try {
        const adminDoc = await db.collection('admins').doc(uid).get();
        return adminDoc.exists;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// --- HEADER LOGIN DROPDOWN FUNCTIONALITY ---
headerLoginBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = headerLoginBtn.parentElement;
    dropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.login-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

loginDropdownMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const role = e.target.dataset.role;
        const dropdown = document.querySelector('.login-dropdown');
        dropdown.classList.remove('active');
        showLogin(role);
    });
});

document.getElementById('explore-plans-btn').addEventListener('click', () => {
    document.getElementById('subscription-plans').scrollIntoView({ behavior: 'smooth' });
});

document.querySelectorAll('.plan-button').forEach(button => {
    button.addEventListener('click', () => {
        showLogin('member');
    });
});

// --- NAVIGATION FUNCTIONS ---
function showLogin(role) {
    hideAllModules();
    
    if (role === 'admin') {
        adminLoginModule.classList.remove('hidden');
        console.log("LOG: Showing Admin Login module.");
    } else if (role === 'member') {
        memberLoginModule.classList.remove('hidden');
        console.log("LOG: Showing Member Login module.");
    } else if (role === 'user') {
        userLoginModule.classList.remove('hidden');
        console.log("LOG: Showing User/Guest Login module.");
    }
}

function hideAllModules() {
    homePage.classList.remove('active');
    homePage.classList.add('hidden');
    adminLoginModule.classList.add('hidden');
    memberLoginModule.classList.add('hidden');
    userLoginModule.classList.add('hidden');
    adminDashboard.classList.add('hidden');
    memberDashboard.classList.add('hidden');
}

function backToHome() {
    hideAllModules();
    homePage.classList.remove('hidden');
    homePage.classList.add('active');
    
    if (adminLoginForm) adminLoginForm.reset();
    if (memberLoginForm) memberLoginForm.reset();
    loginError.textContent = '';
    memberLoginError.textContent = '';
    loginError.style.display = 'none';
    memberLoginError.style.display = 'none';
    
    // Reset global state on logout/back to home
    isAdminAuthenticated = false; 
    isMemberAuthenticated = false; 
    currentMemberDocId = null;
    currentAdminCredentials = { email: null, password: null }; // Clear stored Admin creds
    
    console.log("LOG: Returned to Home Page.");
}

document.getElementById('back-to-home-admin').addEventListener('click', backToHome);
document.getElementById('back-to-home-member').addEventListener('click', backToHome);
document.getElementById('back-to-home-user').addEventListener('click', backToHome);

// --- 1. AUTHENTICATION (ADMIN & MEMBER) ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // 1. Check Admin Role
            await user.getIdToken(true); 
            const isAdmin = await checkAdminStatus(user.uid);

            if (isAdmin) {
                isAdminAuthenticated = true;
                isMemberAuthenticated = false; 
                currentMemberDocId = null; 
                console.log("LOG: Admin successfully logged in.");
                
                hideAllModules();
                adminDashboard.classList.remove('hidden');
                
                setTimeout(() => {
                    loadMembers(); 
                    populateMemberSelect();
                    loadAdminNotifications();
                }, 200); 
                return; 
            } 
            
            // 2. If not Admin, check Member Role
            const memberSnapshot = await db.collection('members')
                .where('firebaseUid', '==', user.uid)
                .limit(1)
                .get();

            if (!memberSnapshot.empty) {
                const memberDoc = memberSnapshot.docs[0];
                const memberData = memberDoc.data();
                currentMemberDocId = memberDoc.id;
                isMemberAuthenticated = true;
                isAdminAuthenticated = false; 

                memberNameDisplay.textContent = memberData.name;
                memberPackageDisplay.textContent = memberData.package;
                console.log(`LOG: Member ${memberData.name} logged in.`);
                
                hideAllModules();
                memberDashboard.classList.remove('hidden');
                
                loadMemberReceipts(user.uid);
                loadMemberNotifications();
                return; 

            } else {
                console.error("LOG: Authenticated user has no valid role/record. Signing out.");
                await auth.signOut();
            }
        } catch (error) {
            console.error("ERROR: Auth state change error:", error);
            await auth.signOut();
            backToHome();
        }
    } else {
        backToHome();
    }
});

// Admin Login
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    loginError.style.display = 'none';
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Store credentials for re-login during member creation
        currentAdminCredentials.email = email;
        currentAdminCredentials.password = password; 

        // CRITICAL FIX: Force token refresh after successful sign-in
        await user.getIdToken(true); 

        adminLoginForm.reset();
    } catch (error) {
        let msg = 'Invalid email or password.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = 'Invalid email or password. Check credentials.';
        } else if (error.code === 'auth/network-request-failed') {
            msg = 'Network error. Please check your connection.';
        } else if (error.code === 'auth/operation-not-allowed') {
            msg = 'Account disabled or login not enabled in Firebase Auth.';
        }
        console.error(`ERROR: Admin login failed. Code: ${error.code}`);
        loginError.textContent = `Login Failed: ${msg}`;
        loginError.style.display = 'block';
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        console.log("LOG: Admin successfully logged out.");
    } catch (error) {
        alert('Logout Error: ' + error.message);
    }
});

// Member Login (unchanged)
memberLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    memberLoginError.textContent = '';
    memberLoginError.style.display = 'none';

    const email = document.getElementById('member-login-email').value;
    const password = document.getElementById('member-login-password').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        memberLoginForm.reset();
    } catch (error) {
        let msg = 'Invalid email or password.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = 'Invalid email or password. Check credentials.';
        } else if (error.code === 'auth/network-request-failed') {
            msg = 'Network error. Please check your connection.';
        }
        console.error(`ERROR: Member login failed. Code: ${error.code}`);
        memberLoginError.textContent = `Login Failed: ${msg}`;
        memberLoginError.style.display = 'block';
    }
});

memberLogoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        currentMemberDocId = null;
        console.log("LOG: Member successfully logged out.");
    } catch (error) {
        alert('Logout Error: ' + error.message);
    }
});

// --- 2. ADMIN: MEMBER MANAGEMENT ---
addMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    memberStatus.textContent = '';
    memberStatus.classList.remove('success', 'error-msg');
    
    if (!isAdminAuthenticated) {
        memberStatus.textContent = `❌ Error: Admin privileges not confirmed. Please log in again.`;
        memberStatus.classList.add('error-msg');
        memberStatus.style.display = 'block';
        console.error("ERROR: Admin state check failed before adding member.");
        await auth.signOut();
        return;
    }

    const name = document.getElementById('member-name').value;
    const email = document.getElementById('member-email').value;
    const password = document.getElementById('member-password').value;
    const phone = document.getElementById('member-phone').value;
    const pkg = document.getElementById('member-package').value;
    const fee = document.getElementById('member-fee').value;
    const joinDate = new Date().toISOString().split('T')[0];

    if (password.length < 6) {
        memberStatus.textContent = `❌ Error: Password must be at least 6 characters long.`;
        memberStatus.classList.add('error-msg');
        memberStatus.style.display = 'block';
        console.error("ERROR: Password less than 6 characters.");
        return; 
    }

    // Use hardcoded credentials for re-login if currentAdminCredentials is unreliable
    const ADMIN_EMAIL = 'admin@test.com'; // Implemented your provided Admin Email
    const ADMIN_PASSWORD = 'Admin@1234'; // Implemented your provided Admin Password 

    // CRITICAL: Check if credentials are valid before continuing the operation
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        memberStatus.textContent = `❌ Error: Admin credentials not set in script.js.`;
        memberStatus.classList.add('error-msg');
        memberStatus.style.display = 'block';
        return;
    }

    await auth.signOut(); // Sign out Admin before creating the new member Auth account
    
    try {
        // Step 1: Create Auth User
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const memberUid = userCredential.user.uid;

        const newMemberData = {
            name, email, phone, package: pkg,
            monthlyFee: parseFloat(fee),
            joinDate: joinDate,
            isActive: true,
            dueDate: joinDate,
            firebaseUid: memberUid
        };
        
        // Step 2a: Re-login Admin to gain write permissions for Firestore
        await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        await auth.currentUser.getIdToken(true); // Force token refresh
        
        const docRef = await db.collection('members').add(newMemberData);
        
        memberStatus.textContent = `✅ Member ${name} added successfully! Email: ${email}, Password: ${password}`;
        memberStatus.classList.add('success');
        memberStatus.style.display = 'block';
        addMemberForm.reset();
        console.log(`LOG: Member ${name} added successfully (UID: ${memberUid}).`);
        
        // Step 2b: Admin must sign out again to prevent the auth listener loop
        await auth.signOut();
        
        // Step 3: Admin re-logs in (this triggers onAuthStateChanged to reload the Admin dashboard)
        await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD); 
        
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/email-already-in-use') {
            msg = 'Email is already registered. Use a different email.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'Password is too weak. Must be at least 6 characters.';
        } else if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
            msg = 'Database permission denied. Admin document or token mismatch.';
        } else if (error.code === 'auth/internal-error' && error.message.includes('INVALID_LOGIN_CREDENTIALS')) {
            msg = 'Admin re-login failed! Check the Admin password constant in the code.';
        }
        memberStatus.textContent = `❌ Error adding member: ${msg}`;
        memberStatus.classList.add('error-msg');
        memberStatus.style.display = 'block';
        console.error(`ERROR: Failed to add member. Code: ${error.code}.`, error);
        
        // Re-login admin on failure to restore state
        await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD).catch(err => console.error("Failed to re-login admin on member creation error:", err));
    }
});


async function loadMembers() {
    memberList.innerHTML = '<li>Loading members...</li>';
    membersDataTableBody.innerHTML = '';
    try {
        // The isAdmin() check in the rules allows this broad read.
        const snapshot = await db.collection('members').orderBy('joinDate', 'desc').get();
        memberList.innerHTML = '';
        
        const dataTable = document.getElementById('members-data-table');
        if (snapshot.empty) {
            memberList.innerHTML = '<li>No members found.</li>';
            dataTable.classList.add('hidden');
            return;
        } else {
            dataTable.classList.remove('hidden');
        }

        snapshot.forEach(doc => {
            const member = doc.data();
            const docId = doc.id;
            
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${member.name}</strong> (${member.package})<br>
                    <small>Email: ${member.email} | Fee: ₹${member.monthlyFee} | Joined: ${member.joinDate}</small>
                </div>
                <button onclick="deleteMember('${docId}', '${member.email}', '${member.firebaseUid}')">Delete</button>
            `;
            memberList.appendChild(li);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${member.name}</td>
                <td>${member.email}</td>
                <td>${member.phone}</td>
                <td>${member.package}</td>
                <td>${member.monthlyFee}</td>
                <td>${member.joinDate}</td>
                <td>${member.firebaseUid}</td>
            `;
            membersDataTableBody.appendChild(tr);
        });

    } catch (error) {
        memberList.innerHTML = `<li>Error loading members: ${error.message}</li>`;
        console.error("ERROR: Failed to load members:", error);
    }
}

window.deleteMember = async function(docId, email, firebaseUid) {
    if (!confirm(`Are you sure you want to delete ${email}?`)) {
        return;
    }
    
    if (!isAdminAuthenticated) {
        alert("Error: Admin privileges not confirmed. Please log in again.");
        await auth.signOut();
        return;
    }
    
    try {
        await db.collection('members').doc(docId).delete();
        alert(`Member deleted successfully: ${email}`);
        console.warn(`LOG: Member deleted (ID: ${docId}, Email: ${email}).`);
        loadMembers();
    } catch (error) {
        alert('Error deleting member: ' + error.message);
        console.error("ERROR: Failed to delete member:", error);
    }
};

exportMembersBtn.addEventListener('click', () => {
    const table = document.getElementById('members-data-table');
    if (!table || table.getElementsByTagName('tbody')[0].rows.length === 0) {
        alert("No member data to export.");
        return;
    }
    
    const rows = table.querySelectorAll('tr');
    let csv = [];

    for (let i = 0; i < rows.length; i++) {
        const row = [];
        const cols = rows[i].querySelectorAll('th, td');
        
        for (let j = 0; j < cols.length; j++) {
            let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
            data = data.replace(/"/g, '""');
            row.push(`"${data}"`);
        }
        csv.push(row.join(','));
    }

    const csv_string = csv.join('\n');
    const filename = `FitZone_Members_Export_${new Date().toLocaleDateString()}.csv`;

    const link = document.createElement('a');
    link.style.display = 'none';
    link.setAttribute('target', '_blank');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv_string));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`LOG: Member list exported as ${filename}`);
});

// --- 3. ADMIN: BILLING MANAGEMENT ---
async function populateMemberSelect() {
    billMemberSelect.innerHTML = '<option value="">Loading Members...</option>';
    allMembers = {};
    try {
        // The isAdmin() check in the rules allows this broad read.
        const snapshot = await db.collection('members').where('isActive', '==', true).get();
        billMemberSelect.innerHTML = '<option value="">Select Member</option>';
        
        snapshot.forEach(doc => {
            const member = doc.data();
            allMembers[doc.id] = member;
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${member.name} (${member.package})`;
            billMemberSelect.appendChild(option);
        });
        console.log(`LOG: Populated member select with ${snapshot.size} active members.`);

    } catch (error) {
        console.error("ERROR: Error populating member select:", error);
        billMemberSelect.innerHTML = '<option value="">Error Loading Members</option>';
    }
}

billMemberSelect.addEventListener('change', async () => {
    const memberId = billMemberSelect.value;
    if (memberId && allMembers[memberId]) {
        billAmountInput.value = allMembers[memberId].monthlyFee;
        document.getElementById('bill-issue-date').value = new Date().toISOString().split('T')[0];
    } else {
        billAmountInput.value = '';
    }
});

createBillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    billStatus.textContent = '';
    billStatus.classList.remove('success', 'error-msg');

    if (!isAdminAuthenticated) {
        billStatus.textContent = `❌ Error: Admin privileges not confirmed.`;
        billStatus.classList.add('error-msg');
        billStatus.style.display = 'block';
        return;
    }

    const memberId = billMemberSelect.value;
    const issueDate = document.getElementById('bill-issue-date').value;
    const amount = parseFloat(billAmountInput.value);
    if (!memberId || isNaN(amount)) return;
    
    const memberDetails = allMembers[memberId];
    if (!memberDetails) return;
    
    const memberUid = memberDetails.firebaseUid; 

    try {
        const batch = db.batch();

        const newBillRef = db.collection('bills').doc();
        batch.set(newBillRef, {
            memberId: memberUid, 
            memberName: memberDetails.name,
            package: memberDetails.package,
            amount: amount,
            issueDate: issueDate,
            paymentDate: null, 
            status: 'Pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const memberRef = db.collection('members').doc(memberId);
        batch.update(memberRef, {
            dueDate: issueDate,
            lastBillAmount: amount, 
        });

        await batch.commit();

        billStatus.textContent = `✅ Bill generated successfully for ${memberDetails.name}!`;
        billStatus.classList.add('success');
        billStatus.style.display = 'block';
        createBillForm.reset();
        populateMemberSelect();
        console.log(`LOG: Bill generated for ${memberDetails.name} (UID: ${memberUid}).`);
        
    } catch (error) {
        console.error("ERROR: Error creating bill:", error);
        billStatus.textContent = `❌ Error creating bill: ${error.message}`;
        billStatus.classList.add('error-msg');
        billStatus.style.display = 'block';
    }
});

// --- 4. ADMIN: NOTIFICATIONS MANAGEMENT ---
assignNotificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    notificationStatus.textContent = '';
    notificationStatus.classList.remove('success', 'error-msg');
    
    if (!isAdminAuthenticated) {
        notificationStatus.textContent = `❌ Error: Admin privileges not confirmed.`;
        notificationStatus.classList.add('error-msg');
        notificationStatus.style.display = 'block';
        return;
    }

    const title = document.getElementById('notification-title').value;
    const message = document.getElementById('notification-message').value;
    const expiryDate = document.getElementById('notification-expiry').value;

    const newNotification = {
        title: title, message: message, isGeneral: true,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: expiryDate || null, 
        createdBy: auth.currentUser.email || 'Admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('notifications').add(newNotification);
        notificationStatus.textContent = `✅ Notification "${title}" published successfully!`;
        notificationStatus.classList.add('success');
        notificationStatus.style.display = 'block';
        assignNotificationForm.reset();
        loadAdminNotifications();
        console.log(`LOG: Notification published: ${title}`);
    } catch (error) {
        notificationStatus.textContent = `❌ Error publishing notification: ${error.message}`;
        notificationStatus.classList.add('error-msg');
        notificationStatus.style.display = 'block';
        console.error("ERROR: Failed to publish notification:", error);
    }
});

async function loadAdminNotifications() {
    activeAnnouncementsList.innerHTML = '<li>Loading announcements...</li>';
    try {
        const now = new Date().toISOString().split('T')[0];
        
        // This read is allowed by isAdmin() rule
        const snapshot = await db.collection('notifications')
            .where('isGeneral', '==', true)
            .get();
        
        activeAnnouncementsList.innerHTML = '';
        let hasActive = false;
        
        const docs = snapshot.docs.sort((a, b) => {
            const dateA = a.data().issueDate || '';
            const dateB = b.data().issueDate || '';
            return dateB.localeCompare(dateA);
        });
        
        docs.forEach(doc => {
            const announcement = doc.data();
            if (announcement.expiryDate && announcement.expiryDate < now) return; 
            hasActive = true;
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${announcement.title}</strong><br>
                    <small>${announcement.message}</small>
                </div>
                <button onclick="deleteNotification('${doc.id}')">Delete</button>
            `;
            activeAnnouncementsList.appendChild(li);
        });
        
        if (!hasActive) activeAnnouncementsList.innerHTML = '<li>No active announcements.</li>';
        console.log(`LOG: Loaded ${snapshot.size} notifications for admin view.`);
    } catch (error) {
        activeAnnouncementsList.innerHTML = `<li>Error loading announcements: ${error.message}</li>`;
        console.error("ERROR: Failed to load admin notifications:", error);
    }
}

window.deleteNotification = async function(docId) {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
        await db.collection('notifications').doc(docId).delete();
        loadAdminNotifications();
        console.warn(`LOG: Notification deleted (ID: ${docId}).`);
    } catch (error) {
        alert('Error deleting notification: ' + error.message);
        console.error("ERROR: Failed to delete notification:", error);
    }
};

// --- 5. MEMBER: VIEW RECEIPTS ---
async function loadMemberReceipts(currentUserUid) {
    receiptList.innerHTML = '<li>Loading bill receipts...</li>';
    if (!isMemberAuthenticated) {
         receiptList.innerHTML = '<li>Error: Member not authenticated.</li>';
         return;
    }
    
    try {
        const billSnapshot = await db.collection('bills')
            .where('memberId', '==', currentUserUid)
            .get();

        const bills = billSnapshot.docs.sort((a, b) => {
            const dateA = a.data().issueDate || '';
            const dateB = b.data().issueDate || '';
            return dateB.localeCompare(dateA);
        });

        receiptList.innerHTML = '';
        if (bills.length === 0) {
            receiptList.innerHTML = '<li>You currently have no bill records.</li>';
            return;
        }

        bills.forEach(doc => {
            const bill = doc.data();
            const statusClass = bill.status === 'Paid' ? 'paid' : 'pending';
            const li = document.createElement('li');
            li.className = 'receipt-item';
            li.innerHTML = `
                <div class="receipt-info">
                    <strong>Bill Date:</strong> ${bill.issueDate}<br>
                    <strong>Amount:</strong> ₹${bill.amount.toFixed(2)}
                </div>
                <div class="receipt-status ${statusClass}">
                    ${bill.status}
                </div>
                <div class="receipt-payment">
                    ${bill.status === 'Paid' ? `Paid on: ${bill.paymentDate || 'N/A'}` : 'Payment Pending'}
                </div>
            `;
            receiptList.appendChild(li);
        });
        console.log(`LOG: Loaded ${bills.length} receipts for member.`);

    } catch (error) {
        receiptList.innerHTML = `<li>Error loading your receipts: ${error.message}</li>`;
        console.error("ERROR: Failed to load member receipts:", error);
    }
}

// --- 6. MEMBER: VIEW NOTIFICATIONS ---
async function loadMemberNotifications() {
    memberNotificationList.innerHTML = '<li>Loading notifications...</li>';
    try {
        const now = new Date().toISOString().split('T')[0];
        // This read is allowed if isAuthenticated() and isGeneral == true.
        const snapshot = await db.collection('notifications')
            .where('isGeneral', '==', true)
            .get();
        
        const docs = snapshot.docs.sort((a, b) => {
            const dateA = a.data().issueDate || '';
            const dateB = b.data().issueDate || '';
            return dateB.localeCompare(dateA);
        });
        
        memberNotificationList.innerHTML = '';
        let hasActive = false;
        
        docs.forEach(doc => {
            const announcement = doc.data();
            if (announcement.expiryDate && announcement.expiryDate < now) return; 
            hasActive = true;
            const li = document.createElement('li');
            li.className = 'notification-item';
            li.innerHTML = `
                <h4>${announcement.title}</h4>
                <p>${announcement.message}</p>
                <small>Posted on: ${announcement.issueDate}</small>
            `;
            memberNotificationList.appendChild(li);
        });
        
        if (!hasActive) memberNotificationList.innerHTML = '<li>No active announcements at this time.</li>';
        console.log(`LOG: Loaded ${snapshot.size} notifications for member view.`);

    } catch (error) {
        memberNotificationList.innerHTML = `<li>Error loading notifications: ${error.message}</li>`;
        console.error("ERROR: Failed to load member notifications:", error);
    }
}

// --- 7. GLOBAL TAB SWITCHING ---
document.querySelectorAll('.tab-btn:not(.member-tab)').forEach(button => {
    button.addEventListener('click', (e) => {
        const tabId = e.target.dataset.tab;
        
        document.querySelectorAll('.tab-btn:not(.member-tab)').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');
        document.getElementById(tabId).classList.add('active');
        console.log(`LOG: Switched to Admin Tab: ${tabId}`);

        if (tabId === 'view-members') loadMembers();
        if (tabId === 'create-bills') populateMemberSelect();
        if (tabId === 'assign-notification') loadAdminNotifications();
    });
});

document.querySelectorAll('.member-tab').forEach(button => {
    button.addEventListener('click', (e) => {
        const tabId = e.target.dataset.tab;
        
        document.querySelectorAll('.member-tab').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.member-tab-pane').forEach(pane => pane.classList.remove('active'));
        document.querySelectorAll('.member-tab-pane').forEach(pane => pane.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');
        document.getElementById(tabId).classList.add('active');
        console.log(`LOG: Switched to Member Tab: ${tabId}`);
        
        if (tabId === 'view-receipts' && auth.currentUser) loadMemberReceipts(auth.currentUser.uid);
        if (tabId === 'view-notifications') loadMemberNotifications();
    });
});