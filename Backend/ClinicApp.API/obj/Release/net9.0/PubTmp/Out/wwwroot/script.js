const baseUrl = "/api";

let medicationTrendChartInstance = null;
let topUsersChartInstance = null;
let detailedUsageChartInstance = null;
let medSearchTimeout = null;
let medicationListState = { items: [], visibleCount: 10, step: 10 };

const HISTORY_REASON_PLACEHOLDER = "Svi razlozi";
const HISTORY_MEDICATION_PLACEHOLDER = "Svi lijekovi";
const HISTORY_USER_PLACEHOLDER = "Svi korisnici";
const DETAILED_MEDICATION_PLACEHOLDER = "Svi lijekovi";

function translateError(message) {
    if (!message) return "Došlo je do greške.";

    const value = message.toLowerCase();

    if (value.includes("invalid username or password")) return "Neispravno korisničko ime ili lozinka.";
    if (value.includes("unauthorized")) return "Niste autorizovani.";
    if (value.includes("forbidden")) return "Nemate dozvolu za ovu akciju.";
    if (value.includes("not found")) return "Traženi podatak nije pronađen.";
    if (value.includes("out of stock")) return "Lijek nije dostupan na stanju.";
    if (value.includes("invalid token")) return "Sesija nije ispravna. Prijavite se ponovo.";
    if (value.includes("validation")) return "Podaci nisu ispravni.";
    if (value.includes("password")) return "Lozinka nije ispravna.";

    return "Došlo je do greške.";
}

function getErrorMessage(data, fallbackMessage) {
    return translateError(data?.title || data?.message || fallbackMessage);
}

function setMessage(elementId, text, isError = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = text || "";
    el.className = isError ? "message error" : "message success";
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container || !message) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

function notify(elementId, message, isError = false) {
    setMessage(elementId, message, isError);
    showToast(message, isError ? "error" : "success");
}

function showLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
}

function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
}

async function safeJson(response) {
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

function getStoredUser() {
    const raw = localStorage.getItem("clinicUser");
    return raw ? JSON.parse(raw) : null;
}

function saveUser(user) {
    localStorage.setItem("clinicUser", JSON.stringify(user));
}

function syncBodyModalState() {
    const hasVisibleModal = Array.from(document.querySelectorAll(".modal")).some(modal => !modal.classList.contains("hidden"));
    document.body.classList.toggle("modal-open", hasVisibleModal);
}

let confirmModalResolver = null;

function showConfirmModal({ title, message, confirmText = "Potvrdi", confirmVariant = "danger" }) {
    return new Promise(resolve => {
        const modal = document.getElementById("confirmActionModal");
        const titleEl = document.getElementById("confirmActionTitle");
        const messageEl = document.getElementById("confirmActionMessage");
        const confirmBtn = document.getElementById("confirmActionConfirmBtn");

        if (!modal || !titleEl || !messageEl || !confirmBtn) {
            resolve(window.confirm(message || title || "Da li ste sigurni?"));
            return;
        }

        titleEl.textContent = title || "Potvrdite akciju";
        messageEl.textContent = message || "Da li ste sigurni da želite nastaviti?";
        confirmBtn.textContent = confirmText || "Potvrdi";
        confirmBtn.classList.remove("secondary-btn", "danger-btn");
        if (confirmVariant === "danger") {
            confirmBtn.classList.add("danger-btn");
        } else if (confirmVariant === "secondary") {
            confirmBtn.classList.add("secondary-btn");
        }

        confirmModalResolver = resolve;
        modal.classList.remove("hidden");
        syncBodyModalState();
    });
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input || !button) return;

    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Prikaži" : "Sakrij";
}

function closeConfirmModal(result = false) {
    const modal = document.getElementById("confirmActionModal");
    if (modal) {
        modal.classList.add("hidden");
    }

    if (confirmModalResolver) {
        const resolver = confirmModalResolver;
        confirmModalResolver = null;
        resolver(result);
    }

    syncBodyModalState();
}


async function logout(skipServerCall = false) {
    const user = getStoredUser();

    if (!skipServerCall && user?.token) {
        try {
            await fetch(`${baseUrl}/User/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                }
            });
        } catch {
        }
    }

    localStorage.removeItem("clinicUser");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    resetUiOnLogout();
    updateAuthUI();
    setMessage("loginResult", "");
    setMessage("changePasswordResult", "");
    setMessage("forgotPasswordResult", "");
    closeNotificationsPanel();
    window.scrollTo({ top: 0, behavior: "auto" });
    showToast("Odjavljeni ste.", "warning");
}

function resetUiOnLogout() {
    const historyUserFilterWrap = document.getElementById("historyUserFilterWrap");
    const historyUserFilter = document.getElementById("historyUserFilter");
    const historyReasonFilter = document.getElementById("historyReasonFilter");
    const medicationExcelFile = document.getElementById("medicationExcelFile");
    const historyMedicationFilter = document.getElementById("historyMedicationFilter");
    const detailedUserFilter = document.getElementById("detailedUserFilter");
    const detailedMedicationFilter = document.getElementById("detailedMedicationFilter");

    if (historyUserFilterWrap) historyUserFilterWrap.style.display = "none";
    if (historyUserFilter) historyUserFilter.innerHTML = `<option value="">${HISTORY_USER_PLACEHOLDER}</option>`;
    if (historyReasonFilter) historyReasonFilter.innerHTML = `<option value="">${HISTORY_REASON_PLACEHOLDER}</option>`;
    if (historyMedicationFilter) historyMedicationFilter.innerHTML = `<option value="">${HISTORY_MEDICATION_PLACEHOLDER}</option>`;
    if (detailedUserFilter) detailedUserFilter.innerHTML = `<option value="">${HISTORY_USER_PLACEHOLDER}</option>`;
    if (detailedMedicationFilter) detailedMedicationFilter.innerHTML = `<option value="">${DETAILED_MEDICATION_PLACEHOLDER}</option>`;
}

function getAuthHeaders() {
    const user = getStoredUser();
    const headers = { "Content-Type": "application/json" };

    if (user?.token) {
        headers.Authorization = `Bearer ${user.token}`;
    }

    return headers;
}

let isRefreshingToken = false;
let refreshPromise = null;

async function tryRefreshToken() {
    const user = getStoredUser();

    if (!user?.id || !user?.refreshToken) {
        return false;
    }

    if (isRefreshingToken && refreshPromise) {
        return refreshPromise;
    }

    isRefreshingToken = true;

    refreshPromise = (async () => {
        try {
            const response = await fetch(`${baseUrl}/User/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    refreshToken: user.refreshToken
                })
            });

            const data = await safeJson(response);

            if (!response.ok || !data?.token || !data?.refreshToken) {
                return false;
            }

            saveUser({
                ...user,
                token: data.token,
                refreshToken: data.refreshToken,
                id: data.id,
                username: data.username,
                role: data.role,
                mustChangePassword: data.mustChangePassword
            });

            return true;
        } catch {
            return false;
        } finally {
            isRefreshingToken = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

async function authFetch(url, options = {}, retry = true) {
    const mergedOptions = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {})
        }
    };

    let response = await fetch(url, mergedOptions);

    if (response.status === 401 && retry) {
        const refreshed = await tryRefreshToken();

        if (refreshed) {
            const retryOptions = {
                ...options,
                headers: {
                    ...getAuthHeaders(),
                    ...(options.headers || {})
                }
            };
            response = await fetch(url, retryOptions);
        } else {
            await logout(true);
            notify("loginResult", "Sesija je istekla. Prijavite se ponovo.", true);
        }
    }

    return response;
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleString("bs-BA");
}

function formatShortDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("bs-BA");
}

function formatDateWithDay(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("bs-BA", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function setDateInputsToToday() {
    const today = new Date().toISOString().split("T")[0];
    [
        "historyFromDate", "historyToDate",
        "medTrendFromDate", "medTrendToDate",
        "topUsersFromDate", "topUsersToDate",
        "detailedFromDate", "detailedToDate"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });
}

function updateRoleLabels(role) {
    const isAdmin = role === "admin";

    const medicationTitle = document.getElementById("medicationsCardTitle");
    const historyTitle = document.getElementById("historyCardTitle");
    const topMedicationTitle = document.getElementById("topMedicationCardTitle");
    const historySectionTitle = document.getElementById("historySectionTitle");
    const statsSectionTitle = document.getElementById("statsSectionTitle");

    if (medicationTitle) medicationTitle.textContent = isAdmin ? "Ukupno lijekova" : "Dostupni lijekovi";
    if (historyTitle) historyTitle.textContent = isAdmin ? "Ukupno uzimanja" : "Moja uzimanja";
    if (topMedicationTitle) topMedicationTitle.textContent = isAdmin ? "Najčešće korišten lijek" : "Moj najčešći lijek";
    if (historySectionTitle) historySectionTitle.textContent = isAdmin ? "Historija lijekova" : "Moja historija lijekova";
    if (statsSectionTitle) statsSectionTitle.textContent = isAdmin ? "Analitika klinike" : "Moja analitika lijekova";
}

function applyRoleVisibility(role) {
    const isAdmin = role === "admin";
    const excelImportCard = document.getElementById("excelImportCard");

    document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = isAdmin ? "" : "none";
    });

    document.querySelectorAll(".admin-only-section").forEach(el => {
        el.classList.toggle("hidden", !isAdmin);
    });

    if (excelImportCard) {
        excelImportCard.style.display = isAdmin ? "block" : "none";
    }
}


function setActiveNavButtonBySection(sectionId) {
    document.querySelectorAll(".tab-btn[data-section]").forEach(button => {
        button.classList.toggle("active", button.getAttribute("data-section") === sectionId);
    });
}

function activateDefaultDashboardSection() {
    showSection("medicationsSection");
}

function showSection(sectionId, btn) {
    document.querySelectorAll(".section-view").forEach(section => {
        section.classList.add("hidden");
        section.classList.remove("active-view");
    });

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active-view");
    }

    document.querySelectorAll(".tab-btn").forEach(button => button.classList.remove("active"));
    if (btn) btn.classList.add("active");

    closeMedicationModal();
    closeTakeMedicationModal();

    if (!btn) setActiveNavButtonBySection(sectionId);

    if (sectionId === "historySection") loadHistory();
    if (sectionId === "statsSection") loadStats();
    if (sectionId === "usersSection") loadUsers();
    if (sectionId === "notificationSettingsSection") {
        loadNotificationPreferences();
        loadNotifications();
    }
}

function updateAuthUI() {
    const user = getStoredUser();

    const loginSection = document.getElementById("loginSection");
    const changePasswordSection = document.getElementById("changePasswordSection");
    const dashboardSection = document.getElementById("dashboardSection");
    const currentUserBox = document.getElementById("currentUserBox");
    const welcomeText = document.getElementById("welcomeText");
    const mainNav = document.getElementById("mainNav");

    if (user?.token) {
        if (currentUserBox) currentUserBox.classList.remove("hidden");
        if (mainNav) mainNav.classList.remove("hidden");
        if (welcomeText) welcomeText.textContent = `${user.username} (${user.role})`;

        if (user.mustChangePassword) {
            loginSection?.classList.add("hidden");
            dashboardSection?.classList.add("hidden");
            changePasswordSection?.classList.remove("hidden");
            window.scrollTo({ top: 0, behavior: "auto" });
            return;
        }

        loginSection?.classList.add("hidden");
        changePasswordSection?.classList.add("hidden");
        dashboardSection?.classList.remove("hidden");

        applyRoleVisibility(user.role);
        updateRoleLabels(user.role);
        initializeHistoryFilters();
        loadNotifications();
        loadNotificationPreferences();
        initializeDetailedChartFilters();
        activateDefaultDashboardSection();
        loadAllDashboardData();
        setTimeout(() => { maybeShowNotificationOnboarding(); }, 250);
    } else {
        loginSection?.classList.remove("hidden");
        changePasswordSection?.classList.add("hidden");
        dashboardSection?.classList.add("hidden");
        currentUserBox?.classList.add("hidden");
        mainNav?.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: "auto" });
    }
}

async function login() {
    const username = document.getElementById("loginUsername")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();

    if (!username || !password) {
        notify("loginResult", "Korisničko ime i lozinka su obavezni.", true);
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/User/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("loginResult", getErrorMessage(data, "Prijava nije uspjela."), true);
            return;
        }

        saveUser({
            token: data.token,
            refreshToken: data.refreshToken,
            id: data.id,
            username: data.username,
            role: data.role,
            mustChangePassword: data.mustChangePassword
        });

        await loadCurrentUser();

        const passwordInput = document.getElementById("loginPassword");
        if (passwordInput) passwordInput.value = "";

        if (data.mustChangePassword) {
            const currentPassword = document.getElementById("currentPassword");
            if (currentPassword) currentPassword.value = password;
            notify("loginResult", "Prva prijava uspješna. Potrebno je promijeniti lozinku.");
        } else {
            notify("loginResult", `Uspješna prijava: ${data.username} (${data.role})`);
        }

        updateAuthUI();
        setTimeout(() => { maybeShowNotificationOnboarding(); }, 250);
    } catch {
        notify("loginResult", "Greška prilikom prijave.", true);
    }
}

async function changePassword() {
    const currentPassword = document.getElementById("currentPassword")?.value.trim();
    const newPassword = document.getElementById("newPassword")?.value.trim();

    if (!currentPassword || !newPassword) {
        notify("changePasswordResult", "Trenutna i nova lozinka su obavezne.", true);
        return;
    }

    try {
        const response = await authFetch(`${baseUrl}/User/change-password`, {
            method: "POST",
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("changePasswordResult", getErrorMessage(data, "Promjena lozinke nije uspjela."), true);
            return;
        }

        const currentUser = getStoredUser();
        if (currentUser) {
            saveUser({ ...currentUser, mustChangePassword: false });
        }

        if (document.getElementById("currentPassword")) document.getElementById("currentPassword").value = "";
        if (document.getElementById("newPassword")) document.getElementById("newPassword").value = "";

        notify("changePasswordResult", "Lozinka je uspješno promijenjena.");
        updateAuthUI();
    } catch {
        notify("changePasswordResult", "Greška prilikom promjene lozinke.", true);
    }
}

async function addUser() {
    const username = document.getElementById("userUsername")?.value.trim() || "";
    const email = document.getElementById("newUserEmail")?.value.trim() || "";
    const role = document.getElementById("userRole")?.value || "user";
    const resultEl = document.getElementById("userResult");

    if (resultEl) resultEl.textContent = "";

    if (!username) {
        showToast("Unesite korisničko ime.", "error");
        return;
    }

    if (!email) {
        showToast("Unesite email adresu.", "error");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast("Unesite ispravnu email adresu.", "error");
        return;
    }

    try {
        const response = await authFetch(`${baseUrl}/User`, {
            method: "POST",
            body: JSON.stringify({
                username,
                email,
                role
            })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            const message = getErrorMessage(data, "Dodavanje korisnika nije uspjelo.");
            if (resultEl) resultEl.textContent = message;
            showToast(message, "error");
            return;
        }

        document.getElementById("userUsername").value = "";
        document.getElementById("newUserEmail").value = "";
        document.getElementById("userRole").value = "user";

        const successMessage = `Korisnik ${data.username} je uspješno dodan. Privremena lozinka: ${data.temporaryPassword}`;
        if (resultEl) resultEl.textContent = successMessage;

        showToast("Korisnik je uspješno dodan.", "success");

        await loadUsers();

        if (typeof loadHistoryUsersDropdown === "function") {
            await loadHistoryUsersDropdown();
        }

        if (typeof loadDetailedChartUserDropdown === "function") {
            await loadDetailedChartUserDropdown();
        }

        if (typeof loadAllDashboardData === "function") {
            await loadAllDashboardData();
        }
    } catch (err) {
        console.error("Greška u addUser():", err);
        const message = "Greška prilikom dodavanja korisnika.";
        if (resultEl) resultEl.textContent = message;
        showToast(message, "error");
    }
}
async function resetUserPassword(userId) {
    const confirmed = await showConfirmModal({
        title: "Reset lozinke",
        message: "Da li sigurno želite resetovati lozinku ovom korisniku?",
        confirmText: "Resetuj lozinku",
        confirmVariant: "danger"
    });
    if (!confirmed) return;

    try {
        const response = await authFetch(`${baseUrl}/User/${userId}/reset-password`, { method: "POST" });
        const data = await safeJson(response);

        if (!response.ok) {
            notify("userResult", getErrorMessage(data, "Reset lozinke nije uspio."), true);
            return;
        }

        notify("userResult", `Lozinka resetovana za korisnika ${data.username}. Nova privremena lozinka: ${data.temporaryPassword}`);
        await loadUsers();
    } catch {
        notify("userResult", "Greška prilikom resetovanja lozinke.", true);
    }
}

async function loadUsers() {
    const usersList = document.getElementById("usersList");
    if (!usersList) return;

    try {
        const response = await authFetch(`${baseUrl}/User`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !Array.isArray(data)) {
            usersList.innerHTML = "<div class='empty-state error-state'>Neuspješno učitavanje korisnika.</div>";
            return;
        }

        renderList("usersList", data, user => `
            <div class="user-card redesign-user-card">
                <div class="user-avatar">${(user.username || "?").charAt(0).toUpperCase()}</div>
                <div class="user-meta">
                    <div class="user-meta-top">
                        <strong>${user.username}</strong>
                        <span class="role-badge ${user.role === "admin" ? "admin" : "user"}">${user.role}</span>
                        <strong>${user.email}</strong>
                    </div>
                    <div class="muted-text">${user.mustChangePassword ? "Potrebna promjena lozinke" : "Lozinka je ažurna"}</div>
                </div>
                <div class="action-buttons compact-actions">
                    <button type="button" class="secondary-btn" onclick="viewUserHistory(${user.id})">Historija</button>
                    <button type="button" onclick="resetUserPassword(${user.id})">Reset lozinke</button>
                </div>
            </div>
        `);

        const totalUsers = document.getElementById("totalUsers");
        if (totalUsers) totalUsers.textContent = String(data.length);
    } catch {
        usersList.innerHTML = "<div class='empty-state error-state'>Neuspješno učitavanje korisnika.</div>";
    }
}

function renderList(containerId, items, formatter) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (!items || items.length === 0) {
        container.innerHTML = "<div class='empty-state'>Nema podataka za prikaz.</div>";
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = formatter(item);
        container.appendChild(div);
    });
}

async function addMedication() {
    const name = document.getElementById("medName")?.value.trim() || "";
    const code = document.getElementById("medCode")?.value.trim() || "";
    const manufacturer = document.getElementById("medManufacturer")?.value.trim() || "";
    const category = document.getElementById("medCategory")?.value.trim() || "";
    const strength = document.getElementById("medStrength")?.value.trim() || "";
    const unit = document.getElementById("medUnit")?.value.trim() || "";
    const description = document.getElementById("medDescription")?.value.trim() || "";
    const stock = parseInt(document.getElementById("medStock")?.value || "", 10);
    const minimumStock = parseInt(document.getElementById("medMinimumStock")?.value || "5", 10);
    const requiresPrescription = !!document.getElementById("medRequiresPrescription")?.checked;

    if (!name || !code || Number.isNaN(stock) || stock < 1 || Number.isNaN(minimumStock) || minimumStock < 0) {
        notify("medResult", "Unesite naziv, šifru, ispravnu količinu i minimalnu količinu.", true);
        return;
    }

    try {
        const response = await authFetch(`${baseUrl}/Medication`, {
            method: "POST",
            body: JSON.stringify({
                name,
                code,
                description,
                manufacturer,
                strength,
                unit,
                stock,
                minimumStock,
                category,
                requiresPrescription
            })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("medResult", getErrorMessage(data, "Dodavanje lijeka nije uspjelo."), true);
            return;
        }

        notify("medResult", `Lijek dodan: ${data.name}`);

        document.getElementById("medName").value = "";
        document.getElementById("medCode").value = "";
        document.getElementById("medManufacturer").value = "";
        document.getElementById("medCategory").value = "";
        document.getElementById("medStrength").value = "";
        document.getElementById("medUnit").value = "";
        document.getElementById("medDescription").value = "";
        document.getElementById("medStock").value = "";
        document.getElementById("medMinimumStock").value = "5";
        document.getElementById("medRequiresPrescription").checked = false;

        await loadMedications();
        await refreshAnalyticsIfVisible();
    } catch {
        notify("medResult", "Greška prilikom dodavanja lijeka.", true);
    }
}
function openMedicationModal(med) {
    const modal = document.getElementById("editMedicationModal");
    if (!modal || !med) return;

    document.getElementById("updateMedId").value = med.id ?? "";
    document.getElementById("updateMedName").value = med.name ?? "";
    document.getElementById("updateMedCode").value = med.code ?? "";
    document.getElementById("updateMedManufacturer").value = med.manufacturer ?? "";
    document.getElementById("updateMedCategory").value = med.category ?? "";
    document.getElementById("updateMedStrength").value = med.strength ?? "";
    document.getElementById("updateMedUnit").value = med.unit ?? "";
    document.getElementById("updateMedDescription").value = med.description ?? "";
    document.getElementById("updateMedStock").value = med.stock ?? "";
    document.getElementById("updateMedMinimumStock").value = med.minimumStock ?? 5;
    document.getElementById("updateMedRequiresPrescription").checked = !!med.requiresPrescription;

    const previewId = document.getElementById("editMedicationPreviewId");
    const previewName = document.getElementById("editMedicationPreviewName");
    const previewStock = document.getElementById("editMedicationPreviewStock");
    const hint = document.getElementById("editMedicationModalHint");

    if (previewId) previewId.textContent = `#${med.id}`;
    if (previewName) previewName.textContent = med.name ?? "-";
    if (previewStock) previewStock.textContent = `${med.stock ?? 0} kom`;

    if (hint) {
        hint.textContent = Number(med.stock || 0) === 0
            ? "Lijek je trenutno bez stanja. Po potrebi dopunite zalihu prije narednog evidentiranja."
            : "Ažurirajte podatke, stanje i minimalni prag zalihe.";
    }

    setMessage("updateResult", "");
    modal.classList.remove("hidden");
    syncBodyModalState();
}
function closeMedicationModal() {
    const modal = document.getElementById("editMedicationModal");
    modal?.classList.add("hidden");
    syncBodyModalState();

    const fields = [
        "updateMedId",
        "updateMedName",
        "updateMedCode",
        "updateMedManufacturer",
        "updateMedCategory",
        "updateMedStrength",
        "updateMedUnit",
        "updateMedDescription",
        "updateMedStock",
        "updateMedMinimumStock"
    ];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const checkbox = document.getElementById("updateMedRequiresPrescription");
    if (checkbox) checkbox.checked = false;

    if (document.getElementById("editMedicationPreviewId")) document.getElementById("editMedicationPreviewId").textContent = "-";
    if (document.getElementById("editMedicationPreviewName")) document.getElementById("editMedicationPreviewName").textContent = "-";
    if (document.getElementById("editMedicationPreviewStock")) document.getElementById("editMedicationPreviewStock").textContent = "-";

    setMessage("updateResult", "");
}
async function updateMedication() {
    const id = parseInt(document.getElementById("updateMedId")?.value || "", 10);
    const name = document.getElementById("updateMedName")?.value.trim() || "";
    const code = document.getElementById("updateMedCode")?.value.trim() || "";
    const manufacturer = document.getElementById("updateMedManufacturer")?.value.trim() || "";
    const category = document.getElementById("updateMedCategory")?.value.trim() || "";
    const strength = document.getElementById("updateMedStrength")?.value.trim() || "";
    const unit = document.getElementById("updateMedUnit")?.value.trim() || "";
    const description = document.getElementById("updateMedDescription")?.value.trim() || "";
    const stock = parseInt(document.getElementById("updateMedStock")?.value || "", 10);
    const minimumStock = parseInt(document.getElementById("updateMedMinimumStock")?.value || "5", 10);
    const requiresPrescription = !!document.getElementById("updateMedRequiresPrescription")?.checked;

    if (!id || !name || !code || Number.isNaN(stock) || stock < 1 || Number.isNaN(minimumStock) || minimumStock < 0) {
        notify("updateResult", "Unesite naziv, šifru, ispravnu količinu i minimalnu količinu.", true);
        return;
    }

    try {
        const response = await authFetch(`${baseUrl}/Medication/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                name,
                code,
                description,
                manufacturer,
                strength,
                unit,
                stock,
                minimumStock,
                category,
                requiresPrescription
            })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("updateResult", getErrorMessage(data, "Izmjena lijeka nije uspjela."), true);
            return;
        }

        notify("updateResult", `Lijek ažuriran: ${data.name}`);
        await loadMedications();
        await refreshAnalyticsIfVisible();

        setTimeout(() => {
            closeMedicationModal();
            closeTakeMedicationModal();
        }, 500);
    } catch {
        notify("updateResult", "Greška prilikom izmjene lijeka.", true);
    }
}
async function deleteMedicationById(id) {
    const confirmed = await showConfirmModal({
        title: "Brisanje lijeka",
        message: "Da li sigurno želite obrisati ovaj lijek?",
        confirmText: "Obriši lijek",
        confirmVariant: "danger"
    });
    if (!confirmed) return;

    try {
        const response = await authFetch(`${baseUrl}/Medication/${id}`, { method: "DELETE" });
        const data = await safeJson(response);

        if (!response.ok) {
            notify("deleteResult", getErrorMessage(data, "Brisanje lijeka nije uspjelo."), true);
            return;
        }

        notify("deleteResult", data?.message || "Lijek je obrisan.");
        await loadMedications();
        await refreshAnalyticsIfVisible();
    } catch {
        notify("deleteResult", "Greška prilikom brisanja lijeka.", true);
    }
}

function getMedicationStatusMeta(stock, minimumStock = 5) {
    const safeStock = Number(stock || 0);
    const safeMinimumStock = Number.isFinite(Number(minimumStock)) ? Number(minimumStock) : 5;

    if (safeStock === 0) {
        return {
            rowClass: "out-of-stock-row",
            badge: "<span class='status-badge danger'>Nema na stanju</span>",
            stateLabel: "Nema na stanju",
            helper: "Potrebna je hitna dopuna zaliha.",
            metaClass: "danger",
            progressWidth: 0,
            toneClass: "danger"
        };
    }

    if (safeStock > 0 && safeStock <= safeMinimumStock) {
        return {
            rowClass: "low-stock-row",
            badge: "<span class='status-badge warning'>Pri kraju</span>",
            stateLabel: "Pri kraju",
            helper: `Minimalno stanje je ${safeMinimumStock} kom.`,
            metaClass: "warning",
            progressWidth: Math.max(12, Math.min(100, safeStock * 12)),
            toneClass: "warning"
        };
    }

    return {
        rowClass: "",
        badge: "<span class='status-badge ok'>Na stanju</span>",
        stateLabel: "Na stanju",
        helper: "Spremno za evidentiranje i izdavanje.",
        metaClass: "ok",
        progressWidth: Math.max(24, Math.min(100, safeStock >= 100 ? 100 : safeStock)),
        toneClass: "ok"
    };
}
function updateTakeReasonPreview() {
    const preview = document.getElementById("takeReasonPreview");
    if (!preview) return;

    const reason = getSelectedReason();

    if (!reason) {
        preview.textContent = "Odaberite razlog uzimanja kako biste aktivirali potvrdu.";
        preview.classList.add("empty");
    } else {
        preview.textContent = `Razlog uzimanja: ${reason}`;
        preview.classList.remove("empty");
    }
}

function updateMedicationListMeta(total, shown) {
    const meta = document.getElementById("medicationsListMeta");
    if (!meta) return;

    if (!total) {
        meta.textContent = "Nema lijekova za prikaz prema trenutnim filterima.";
        return;
    }

    meta.textContent = shown < total
        ? `Prikazano ${shown} od ${total} lijekova. Kliknite „Prikaži još” za ostatak liste.`
        : `Ukupno prikazano ${shown} lijekova.`;
}

function renderMedicationCards() {
    const list = document.getElementById("medicationsList");
    const loadMoreBtn = document.getElementById("loadMoreMedicationsBtn");
    if (!list) return;

    const allItems = Array.isArray(medicationListState.items) ? medicationListState.items : [];

    if (allItems.length === 0) {
        list.innerHTML = "<div class='empty-state'>Nema lijekova za prikaz.</div>";
        if (loadMoreBtn) loadMoreBtn.classList.add("hidden");
        updateMedicationListMeta(0, 0);
        const totalMedications = document.getElementById("totalMedications");
        if (totalMedications) totalMedications.textContent = "0";
        return;
    }

    const visibleItems = allItems.slice(0, medicationListState.visibleCount);
    const isAdmin = getStoredUser()?.role === "admin";

    renderList("medicationsList", visibleItems, med => {
        const stock = Number(med.stock || 0);
        const minimumStock = Number(med.minimumStock || 5);
        const status = getMedicationStatusMeta(stock, minimumStock);
        const takeDisabled = stock === 0 ? "disabled" : "";
        const medPayload = encodeURIComponent(JSON.stringify(med));
        const encodedName = JSON.stringify(String(med.name)).replace(/"/g, '&quot;');

        const adminActions = isAdmin
            ? `<button type="button" class="secondary-btn" onclick='openMedicationModal(JSON.parse(decodeURIComponent("${medPayload}")))'>Uredi</button>
               <button type="button" class="danger-btn" onclick="deleteMedicationById(${med.id})">Obriši</button>`
            : "";

        return `
            <article class="medication-card redesign-medication-card ${status.rowClass}">
                <div class="medication-card-head">
                    <div>
                        <div class="medication-title">
                            <span class="medication-name">${med.name}</span>
                            ${status.badge}
                        </div>
                        <div class="medication-submeta medication-submeta--stack">
                            <span class="muted-text"><strong>Šifra:</strong> ${med.code || "-"}</span>
                            <span class="muted-text"><strong>Proizvođač:</strong> ${med.manufacturer || "-"}</span>
                            <span class="muted-text"><strong>Kategorija:</strong> ${med.category || "-"}</span>
                            <span class="muted-text"><strong>Jačina:</strong> ${med.strength || "-"} ${med.unit || ""}</span>
                            <span class="muted-text"><strong>Minimalno stanje:</strong> ${minimumStock} kom</span>
                            <span class="muted-text"><strong>Recept:</strong> ${med.requiresPrescription ? "Da" : "Ne"}</span>
                        </div>
                    </div>

                    <div class="medication-card-kpi ${status.metaClass}">
                        <strong>${stock}</strong>
                        <span>kom</span>
                    </div>
                </div>

                ${med.description ? `<p class="medication-description">${med.description}</p>` : ""}

                <div class="stock-progress-shell">
                    <div class="stock-progress-labels">
                        <span>Zaliha</span>
                        <span>${stock} kom</span>
                    </div>
                    <div class="stock-progress-track ${status.toneClass}">
                        <div class="stock-progress-bar ${status.toneClass}" style="width:${status.progressWidth}%"></div>
                    </div>
                </div>

                <div class="medication-actions redesign-actions">
                    <button type="button" class="take-btn primary-action" onclick="takeMedicationFromList(${med.id}, ${encodedName}, ${stock})" ${takeDisabled}>
                        ${stock === 0 ? "Nema na stanju" : "Uzmi lijek"}
                    </button>
                    ${adminActions}
                </div>
            </article>
        `;
    });

    if (loadMoreBtn) {
        loadMoreBtn.classList.toggle("hidden", visibleItems.length >= allItems.length);
    }

    updateMedicationListMeta(allItems.length, visibleItems.length);

    const totalMedications = document.getElementById("totalMedications");
    if (totalMedications) totalMedications.textContent = String(allItems.length);
}
function loadMoreMedications() {
    medicationListState.visibleCount += medicationListState.step;
    renderMedicationCards();
}

function toggleCustomReasonInput() {
    const select = document.getElementById("takeReasonSelect");
    const customInput = document.getElementById("takeReasonCustom");
    if (!select || !customInput) return;

    const isCustom = select.value === "Drugo";
    customInput.classList.toggle("hidden", !isCustom);

    if (!isCustom) {
        customInput.value = "";
    }

    updateTakeReasonPreview();
}

function getSelectedReason() {
    const select = document.getElementById("takeReasonSelect");
    const custom = document.getElementById("takeReasonCustom");

    if (!select) return "";

    if (select.value === "Drugo") {
        return custom ? custom.value.trim() : "";
    }

    return select.value.trim();
}

function takeMedicationFromList(id, name = "", stock = 0) {
    openTakeMedicationModal(id, typeof name === "string" ? name : "", Number(stock || 0));
}

async function loadMedications() {
    const list = document.getElementById("medicationsList");
    if (!list) return;

    try {
        const search = document.getElementById("medSearch")?.value.trim() || "";
        const stockFilter = document.getElementById("medStockFilter")?.value || "";

        list.innerHTML = "<div class='spinner-inline'></div>";

        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (stockFilter) params.append("stockFilter", stockFilter);

        const url = params.toString() ? `${baseUrl}/Medication?${params.toString()}` : `${baseUrl}/Medication`;
        const response = await authFetch(url, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !Array.isArray(data)) {
            list.innerHTML = "<div class='item error'>Neuspješno učitavanje lijekova.</div>";
            return;
        }

        medicationListState.items = data;
        medicationListState.visibleCount = medicationListState.step;
        renderMedicationCards();
    } catch {
        list.innerHTML = "<div class='item error'>Neuspješno učitavanje lijekova.</div>";
    }
}

function clearMedicationFilters() {
    if (document.getElementById("medSearch")) document.getElementById("medSearch").value = "";
    if (document.getElementById("medStockFilter")) document.getElementById("medStockFilter").value = "";
    medicationListState.visibleCount = medicationListState.step;
    loadMedications();
}

function debounceLoadMedications() {
    clearTimeout(medSearchTimeout);
    medSearchTimeout = setTimeout(() => loadMedications(), 250);
}

function updateMedicationExcelFileLabel() {
    const fileInput = document.getElementById("medicationExcelFile");
    const label = document.getElementById("medicationExcelFileName");
    if (!label) return;
    label.textContent = fileInput?.files?.length ? fileInput.files[0].name : "Nijedan fajl nije odabran";
}

async function downloadMedicationTemplate() {
    try {
        const user = getStoredUser();
        if (!user || user.role !== "admin") {
            showToast("Samo admin može preuzeti template.", "error");
            return;
        }

        const response = await authFetch(`${baseUrl}/Medication/import/template`, {
            method: "GET",
            headers: { Authorization: `Bearer ${user.token}` }
        });

        if (!response.ok) {
            const data = await safeJson(response);
            showToast(getErrorMessage(data, "Preuzimanje template-a nije uspjelo."), "error");
            return;
        }

        const blob = await response.blob();
        downloadBlob(blob, "lijekovi-template.xlsx");
    } catch {
        showToast("Greška prilikom preuzimanja template-a.", "error");
    }
}

async function importMedicationsFromExcel() {
    const fileInput = document.getElementById("medicationExcelFile");
    const resultBox = document.getElementById("medicationImportResult");

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast("Odaberite Excel fajl prije importa.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        showLoading();

        const user = getStoredUser();
        let response = await fetch(`${baseUrl}/Medication/import/excel`, {
            method: "POST",
            headers: { Authorization: `Bearer ${user?.token || ""}` },
            body: formData
        });

        if (response.status === 401) {
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                const refreshedUser = getStoredUser();
                response = await fetch(`${baseUrl}/Medication/import/excel`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${refreshedUser?.token || ""}` },
                    body: formData
                });
            }
        }

        const data = await safeJson(response);

        if (!response.ok) {
            showToast(data?.message || "Import nije uspio.", "error");
            return;
        }

        if (resultBox) {
            const errors = Array.isArray(data.errors) ? data.errors : [];
            resultBox.innerHTML = `
                <div class="import-summary-card">
                    <div><strong>Ukupno redova:</strong> ${data.totalRows ?? 0}</div>
                    <div><strong>Dodano:</strong> ${data.addedCount ?? 0}</div>
                    <div><strong>Ažurirano:</strong> ${data.updatedCount ?? 0}</div>
                    <div><strong>Preskočeno:</strong> ${data.skippedCount ?? 0}</div>
                    ${errors.length ? `<div class="import-errors">${errors.map(err => `<div>${err}</div>`).join("")}</div>` : "<div class='muted-text'>Import završen bez grešaka.</div>"}
                </div>
            `;
        }

        showToast("Excel import uspješno završen.");
        fileInput.value = "";
        updateMedicationExcelFileLabel();
        await loadMedications();
        await refreshAnalyticsIfVisible();
    } catch {
        showToast("Greška prilikom importa Excel fajla.", "error");
    } finally {
        hideLoading();
    }
}

async function loadHistoryUsersDropdown() {
    const user = getStoredUser();
    const wrap = document.getElementById("historyUserFilterWrap");
    const select = document.getElementById("historyUserFilter");
    if (!select) return;

    select.innerHTML = `<option value="">${HISTORY_USER_PLACEHOLDER}</option>`;

    if (!user || user.role !== "admin") {
        if (wrap) wrap.style.display = "none";
        return;
    }

    if (wrap) wrap.style.display = "block";

    try {
        const response = await authFetch(`${baseUrl}/User`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !Array.isArray(data)) return;

        data.forEach(item => {
            select.innerHTML += `<option value="${item.id}">${item.username}</option>`;
        });
    } catch {
        console.log("Greška pri učitavanju korisnika za historiju.");
    }
}

function loadHistoryReasonsDropdown() {
    const historyReasonFilter = document.getElementById("historyReasonFilter");
    const takeReasonSelect = document.getElementById("takeReasonSelect");
    if (!historyReasonFilter || !takeReasonSelect) return;

    historyReasonFilter.innerHTML = `<option value="">${HISTORY_REASON_PLACEHOLDER}</option>`;
    Array.from(takeReasonSelect.options).forEach(option => {
        const value = (option.value || "").trim();
        if (!value) return;
        historyReasonFilter.innerHTML += `<option value="${value}">${option.text}</option>`;
    });
}

async function loadHistoryMedicationsDropdown() {
    const historyMedicationFilter = document.getElementById("historyMedicationFilter");
    if (!historyMedicationFilter) return;

    historyMedicationFilter.innerHTML = `<option value="">${HISTORY_MEDICATION_PLACEHOLDER}</option>`;

    try {
        const response = await authFetch(`${baseUrl}/Medication`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !Array.isArray(data)) return;

        data.forEach(med => {
            historyMedicationFilter.innerHTML += `<option value="${med.id}">${med.name}</option>`;
        });
    } catch {
        console.log("Greška pri učitavanju lijekova za historiju.");
    }
}

async function initializeHistoryFilters() {
    loadHistoryReasonsDropdown();
    await loadHistoryMedicationsDropdown();
    await loadHistoryUsersDropdown();
    handleHistoryRangeChange(false);
}

function applyQuickRange(rangeValue, fromInputId, toInputId) {
    const fromInput = document.getElementById(fromInputId);
    const toInput = document.getElementById(toInputId);
    if (!fromInput || !toInput) return;

    const today = new Date();
    const toValue = today.toISOString().split("T")[0];
    let fromDate = new Date(today);

    switch (rangeValue) {
        case "today":
            break;
        case "7d":
            fromDate.setDate(today.getDate() - 6);
            break;
        case "30d":
            fromDate.setDate(today.getDate() - 29);
            break;
        case "90d":
            fromDate.setDate(today.getDate() - 89);
            break;
        case "365d":
            fromDate.setDate(today.getDate() - 364);
            break;
        case "month":
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case "all":
            fromInput.value = "";
            toInput.value = "";
            return;
        default:
            return;
    }

    fromInput.value = fromDate.toISOString().split("T")[0];
    toInput.value = toValue;
}

function handleHistoryRangeChange(reload = true) {
    const rangeSelect = document.getElementById("historyRange");
    const customRow = document.getElementById("historyCustomDateRow");
    if (!rangeSelect || !customRow) return;

    const rangeValue = rangeSelect.value;
    customRow.classList.toggle("hidden", rangeValue !== "custom");

    if (rangeValue !== "custom") {
        applyQuickRange(rangeValue, "historyFromDate", "historyToDate");
    }

    if (reload) {
        loadHistory();
    }
}

async function loadHistory() {
    const list = document.getElementById("historyList");
    if (!list) return;

    try {
        const fromDate = document.getElementById("historyFromDate")?.value || "";
        const toDate = document.getElementById("historyToDate")?.value || "";
        const historyUserFilter = document.getElementById("historyUserFilter");
        const historyReasonFilter = document.getElementById("historyReasonFilter");
        const historyMedicationFilter = document.getElementById("historyMedicationFilter");
        const exportBtn = document.getElementById("exportHistoryBtn");
        const historyInfoText = document.getElementById("historyInfoText");
        const user = getStoredUser();

        list.innerHTML = "<div class='spinner-inline'></div>";
        if (exportBtn) exportBtn.disabled = true;

        const params = new URLSearchParams();
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
        if (user?.role === "admin" && historyUserFilter?.value) params.append("userId", historyUserFilter.value);
        if (historyReasonFilter?.value) params.append("reason", historyReasonFilter.value);
        if (historyMedicationFilter?.value) params.append("medicationId", historyMedicationFilter.value);

        const url = params.toString() ? `${baseUrl}/MedicationHistory?${params.toString()}` : `${baseUrl}/MedicationHistory`;
        const response = await authFetch(url, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !Array.isArray(data)) {
            list.innerHTML = "<div class='empty-state error-state'>Neuspješno učitavanje historije.</div>";
            return;
        }

        if (exportBtn) exportBtn.disabled = data.length === 0;

        renderList("historyList", data, item => `
            <article class="history-row redesign-history-row">
                <div class="history-main">
                    <div class="history-topline">
                        <strong>${item.medicationName}</strong>
                        <span class="history-date-badge">${formatShortDate(item.takenAt)}</span>
                    </div>
                    <div class="history-tags">
                        <span class="history-tag">${item.username}</span>
                        <span class="history-tag subtle">${item.reason}</span>
                        <span class="history-tag history-qty-tag">${item.quantity ?? 1} kom</span>
                    </div>
                </div>
                <div class="history-time">${formatDate(item.takenAt)}</div>
            </article>
        `);

        const totalHistory = document.getElementById("totalHistory");
        if (totalHistory) totalHistory.textContent = String(data.length);

        if (historyInfoText) {
            const basePeriod = fromDate && toDate
                ? `Prikazani su zapisi za period ${formatShortDate(fromDate)} – ${formatShortDate(toDate)}.`
                : "Prikazuju se svi dostupni zapisi za odabrane filtere.";

            historyInfoText.textContent = `${basePeriod} Ukupno pronađeno: ${data.length}.`;
        }
    } catch {
        list.innerHTML = "<div class='empty-state error-state'>Neuspješno učitavanje historije.</div>";
    }
}

function clearHistoryFilters() {
    if (document.getElementById("historyRange")) document.getElementById("historyRange").value = "today";
    if (document.getElementById("historyUserFilter")) document.getElementById("historyUserFilter").value = "";
    if (document.getElementById("historyReasonFilter")) document.getElementById("historyReasonFilter").value = "";
    if (document.getElementById("historyMedicationFilter")) document.getElementById("historyMedicationFilter").value = "";
    handleHistoryRangeChange(false);
    loadHistory();
}

function viewUserHistory(userId) {
    const historyButton = Array.from(document.querySelectorAll(".tab-btn")).find(btn => btn.textContent.trim() === "Historija");
    showSection("historySection", historyButton || null);

    const historyUserFilter = document.getElementById("historyUserFilter");
    if (historyUserFilter) {
        historyUserFilter.value = String(userId);
    }

    loadHistory();
}

function downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

async function exportMedicationsExcel() {
    try {
        const user = getStoredUser();
        if (!user || user.role !== "admin") {
            showToast("Samo admin može exportovati lijekove.", "error");
            return;
        }

        const search = document.getElementById("medSearch")?.value.trim() || "";
        const stockFilter = document.getElementById("medStockFilter")?.value || "";
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (stockFilter) params.append("stockFilter", stockFilter);

        const url = params.toString() ? `${baseUrl}/Medication/export/excel?${params.toString()}` : `${baseUrl}/Medication/export/excel`;
        const response = await authFetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${user.token}` }
        });

        if (!response.ok) {
            const data = await safeJson(response);
            showToast(getErrorMessage(data, "Eksport lijekova nije uspio."), "error");
            return;
        }

        const blob = await response.blob();
        downloadBlob(blob, "lijekovi.xlsx");
    } catch {
        showToast("Greška prilikom eksporta lijekova.", "error");
    }
}

async function exportHistoryExcel() {
    try {
        const user = getStoredUser();
        if (!user?.token) {
            showToast("Morate biti prijavljeni.", "error");
            return;
        }

        const historyUserFilter = document.getElementById("historyUserFilter");
        const historyReasonFilter = document.getElementById("historyReasonFilter");
        const historyMedicationFilter = document.getElementById("historyMedicationFilter");
        const fromDate = document.getElementById("historyFromDate")?.value || "";
        const toDate = document.getElementById("historyToDate")?.value || "";

        const params = new URLSearchParams();
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
        if (user.role === "admin" && historyUserFilter?.value) params.append("userId", historyUserFilter.value);
        if (historyReasonFilter?.value) params.append("reason", historyReasonFilter.value);
        if (historyMedicationFilter?.value) params.append("medicationId", historyMedicationFilter.value);

        const url = params.toString() ? `${baseUrl}/MedicationHistory/export/excel?${params.toString()}` : `${baseUrl}/MedicationHistory/export/excel`;
        const response = await authFetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${user.token}` }
        });

        if (!response.ok) {
            const data = await safeJson(response);
            showToast(getErrorMessage(data, "Eksport historije nije uspio."), "error");
            return;
        }

        const blob = await response.blob();
        downloadBlob(blob, "historija_lijekova.xlsx");
    } catch {
        showToast("Greška prilikom eksporta historije.", "error");
    }
}

async function loadDetailedChartUserDropdown() {
    const user = getStoredUser();
    const wrap = document.getElementById("detailedUserFilterWrap");
    const select = document.getElementById("detailedUserFilter");
    if (!select) return;

    select.innerHTML = `<option value="">${HISTORY_USER_PLACEHOLDER}</option>`;

    if (!user || user.role !== "admin") {
        if (wrap) wrap.style.display = "none";
        return;
    }

    if (wrap) wrap.style.display = "block";

    try {
        const response = await authFetch(`${baseUrl}/User`, { method: "GET" });
        const data = await safeJson(response);
        if (!response.ok || !Array.isArray(data)) return;

        data.forEach(item => {
            select.innerHTML += `<option value="${item.id}">${item.username}</option>`;
        });
    } catch {
        console.log("Greška pri učitavanju korisnika za detaljni graf.");
    }
}

async function loadDetailedChartMedicationDropdown() {
    const select = document.getElementById("detailedMedicationFilter");
    if (!select) return;

    select.innerHTML = `<option value="">${DETAILED_MEDICATION_PLACEHOLDER}</option>`;

    try {
        const response = await authFetch(`${baseUrl}/Medication`, { method: "GET" });
        const data = await safeJson(response);
        if (!response.ok || !Array.isArray(data)) return;

        data.forEach(med => {
            select.innerHTML += `<option value="${med.id}">${med.name}</option>`;
        });
    } catch {
        console.log("Greška pri učitavanju lijekova za detaljni graf.");
    }
}

async function initializeDetailedChartFilters() {
    await loadDetailedChartMedicationDropdown();
    await loadDetailedChartUserDropdown();
    toggleCustomDateRow("detailedRange", "detailedCustomDates");
    toggleCustomDateRow("medTrendRange", "medTrendCustomDates");
    toggleCustomDateRow("topUsersRange", "topUsersCustomDates");
}

function toggleCustomDateRow(rangeSelectId, rowId) {
    const rangeSelect = document.getElementById(rangeSelectId);
    const row = document.getElementById(rowId);
    if (!rangeSelect || !row) return;

    const isCustom = rangeSelect.value === "custom";
    row.classList.toggle("hidden", !isCustom);

    const mapping = {
        medTrendRange: ["medTrendFromDate", "medTrendToDate"],
        topUsersRange: ["topUsersFromDate", "topUsersToDate"],
        detailedRange: ["detailedFromDate", "detailedToDate"]
    };

    if (!isCustom && mapping[rangeSelectId]) {
        applyQuickRange(rangeSelect.value, mapping[rangeSelectId][0], mapping[rangeSelectId][1]);
    }
}

function destroyChart(chartInstance) {
    if (chartInstance) {
        chartInstance.destroy();
    }
}

function formatGroupByText(groupBy) {
    switch ((groupBy || "").toLowerCase()) {
        case "day": return "Grupisanje: po danu";
        case "week": return "Grupisanje: po sedmici";
        case "month": return "Grupisanje: po mjesecu";
        default: return "Grupisanje: automatsko";
    }
}

function formatPeriodText(data) {
    const fromText = formatShortDate(data?.fromDate);
    const toText = formatShortDate(data?.toDate);
    if (fromText === "-" || toText === "-") return "Period nije dostupan.";
    return `Period: ${fromText} – ${toText}`;
}

function updateChartText(summaryId, metaId, summaryText, data) {
    const summaryEl = document.getElementById(summaryId);
    const metaEl = document.getElementById(metaId);

    if (summaryEl) summaryEl.textContent = summaryText;
    if (metaEl) metaEl.textContent = `${formatPeriodText(data)} • ${formatGroupByText(data?.groupBy)}`;
}

function buildRangeParams(rangeId, fromId, toId, extra = {}) {
    const params = new URLSearchParams();
    const rangeValue = document.getElementById(rangeId)?.value || "30d";
    const fromDate = document.getElementById(fromId)?.value || "";
    const toDate = document.getElementById(toId)?.value || "";

    params.append("range", rangeValue);

    if (rangeValue === "custom") {
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
    }

    Object.entries(extra).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            params.append(key, value);
        }
    });

    return params;
}

function parseDayLabelToDate(label) {
    if (!label || typeof label !== "string") return null;
    const match = label.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTooltipTitle(items, groupBy) {
    const rawLabel = items?.[0]?.label || "";
    if (groupBy === "day") {
        const parsed = parseDayLabelToDate(rawLabel);
        if (parsed) return formatDateWithDay(parsed);
    }
    if (groupBy === "month") return `Mjesec ${rawLabel}`;
    return rawLabel;
}

async function loadMedicationTrendChart() {
    const canvas = document.getElementById("medicationTrendChart");
    if (!canvas) return;

    try {
        const groupBy = document.getElementById("medTrendGroupBy")?.value || "";
        const params = buildRangeParams("medTrendRange", "medTrendFromDate", "medTrendToDate", { groupBy });
        const response = await authFetch(`${baseUrl}/MedicationHistory/chart/medication-trend?${params.toString()}`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok) {
            updateChartText("medTrendSummary", "medTrendMeta", "Podaci za graf nisu dostupni.", {});
            return;
        }

        const datasets = Array.isArray(data.datasets) ? data.datasets.map(item => ({
            label: item.label,
            data: item.values
        })) : [];

        const totalCount = Number(data.totalCount || 0);
        const topMedication = data.topMedication || "nema podataka";
        const topMedicationCount = Number(data.topMedicationCount || 0);
        let summary = `U odabranom periodu evidentirano je ukupno ${totalCount} uzimanja lijekova.`;

        if (topMedicationCount > 0) {
            summary += ` Najzastupljeniji lijek je ${topMedication} sa ${topMedicationCount} evidentiranih uzimanja.`;
        } else {
            summary += " U ovom periodu nema evidentiranih uzimanja.";
        }

        updateChartText("medTrendSummary", "medTrendMeta", summary, data);

        destroyChart(medicationTrendChartInstance);
        medicationTrendChartInstance = new Chart(canvas, {
            type: "line",
            data: {
                labels: data.labels || [],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: { display: true, position: "top" },
                    tooltip: {
                        callbacks: {
                            title(items) {
                                return getTooltipTitle(items, data.groupBy);
                            },
                            label(context) {
                                const value = Number(context.parsed?.y ?? context.raw ?? 0);
                                return `${context.dataset.label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    } catch {
        updateChartText("medTrendSummary", "medTrendMeta", "Došlo je do greške pri učitavanju grafa.", {});
    }
}

async function loadTopUsersChart() {
    const canvas = document.getElementById("topUsersChart");
    if (!canvas) return;

    try {
        const params = buildRangeParams("topUsersRange", "topUsersFromDate", "topUsersToDate");
        const response = await authFetch(`${baseUrl}/MedicationHistory/chart/top-users?${params.toString()}`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok) {
            updateChartText("topUsersSummary", "topUsersMeta", "Podaci za graf nisu dostupni.", {});
            return;
        }

        const totalCount = Number(data.totalCount || 0);
        const topUsername = data.topUsername || "nema podataka";
        const topCount = Number(data.topCount || 0);
        let summary = `U odabranom periodu evidentirano je ukupno ${totalCount} uzimanja lijekova.`;

        if (topCount > 0) {
            summary += ` Najaktivniji korisnik je ${topUsername} sa ${topCount} evidentiranih uzimanja.`;
        } else {
            summary += " U ovom periodu nema aktivnosti korisnika.";
        }

        updateChartText("topUsersSummary", "topUsersMeta", summary, data);

        destroyChart(topUsersChartInstance);
        topUsersChartInstance = new Chart(canvas, {
            type: "bar",
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: data.title || "Najaktivniji korisnici",
                    data: data.values || []
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            title(items) {
                                return items?.[0]?.label || "Korisnik";
                            },
                            label(context) {
                                const value = Number(context.parsed?.y ?? context.raw ?? 0);
                                return `${context.label}: ${value} uzimanja`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    } catch {
        updateChartText("topUsersSummary", "topUsersMeta", "Došlo je do greške pri učitavanju grafa.", {});
    }
}

async function loadDetailedChart() {
    const canvas = document.getElementById("detailedUsageChart");
    if (!canvas) return;

    try {
        const user = getStoredUser();
        const selectedUserId = user?.role === "admin" ? (document.getElementById("detailedUserFilter")?.value || "") : "";
        const medicationId = document.getElementById("detailedMedicationFilter")?.value || "";
        const groupBy = document.getElementById("detailedGroupBy")?.value || "";
        const selectedUserName = user?.role === "admin"
            ? (document.getElementById("detailedUserFilter")?.selectedOptions?.[0]?.text || "Svi korisnici")
            : (user?.username || "Moj pregled");
        const selectedMedicationName = document.getElementById("detailedMedicationFilter")?.selectedOptions?.[0]?.text || "Svi lijekovi";

        const params = buildRangeParams("detailedRange", "detailedFromDate", "detailedToDate", {
            userId: selectedUserId,
            medicationId,
            groupBy
        });

        const response = await authFetch(`${baseUrl}/MedicationHistory/chart/detailed?${params.toString()}`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok) {
            updateChartText("detailedChartSummary", "detailedChartMeta", "Podaci za graf nisu dostupni.", {});
            return;
        }

        const totalCount = Number(data.totalCount || 0);
        const selectedUserText = selectedUserName === HISTORY_USER_PLACEHOLDER ? "sve korisnike" : selectedUserName;
        const selectedMedicationText = selectedMedicationName === DETAILED_MEDICATION_PLACEHOLDER ? "sve lijekove" : selectedMedicationName;
        let summary = `Za odabrane filtere (${selectedUserText} / ${selectedMedicationText}) evidentirano je ukupno ${totalCount} uzimanja.`;

        if (data.peakValue && data.peakValue > 0) {
            summary += ` Najveća aktivnost zabilježena je ${data.peakLabelHuman || data.peakLabel} sa ${data.peakValue} uzimanja.`;
        } else {
            summary += " U odabranom periodu nema evidentiranih uzimanja za ove filtere.";
        }

        updateChartText("detailedChartSummary", "detailedChartMeta", summary, data);

        destroyChart(detailedUsageChartInstance);
        detailedUsageChartInstance = new Chart(canvas, {
            type: "line",
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: data.title || "Detaljna analiza",
                    data: data.values || [],
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            title(items) {
                                return getTooltipTitle(items, data.groupBy);
                            },
                            label(context) {
                                const value = Number(context.parsed?.y ?? context.raw ?? 0);
                                return `${data.title || "Detaljna analiza"}: ${value} uzimanja`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    } catch {
        updateChartText("detailedChartSummary", "detailedChartMeta", "Došlo je do greške pri učitavanju grafa.", {});
    }
}

function clearDetailedChartFilters() {
    if (document.getElementById("detailedRange")) document.getElementById("detailedRange").value = "30d";
    if (document.getElementById("detailedGroupBy")) document.getElementById("detailedGroupBy").value = "";
    if (document.getElementById("detailedUserFilter")) document.getElementById("detailedUserFilter").value = "";
    if (document.getElementById("detailedMedicationFilter")) document.getElementById("detailedMedicationFilter").value = "";
    toggleCustomDateRow("detailedRange", "detailedCustomDates");
    loadDetailedChart();
}

async function loadOverviewTopMedicationSummary() {
    const topMedication = document.getElementById("topMedication");
    if (!topMedication) return;

    try {
        const response = await authFetch(`${baseUrl}/MedicationHistory/stats`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !Array.isArray(data) || data.length === 0) {
            topMedication.textContent = "-";
            return;
        }

        const top = data.reduce((max, current) => current.takenCount > max.takenCount ? current : max);
        topMedication.textContent = `${top.medication} (${top.takenCount})`;
    } catch {
        topMedication.textContent = "-";
    }
}

async function loadAdminDetailedStats() {
    const user = getStoredUser();

    if (!user || user.role !== "admin") {
        const overviewTodayCount = document.getElementById("overviewTodayCount");
        const overviewOutOfStockCount = document.getElementById("overviewOutOfStockCount");
        const overviewMostCommonReason = document.getElementById("overviewMostCommonReason");
        const overviewStockWarning = document.getElementById("overviewStockWarning");

        if (overviewTodayCount) overviewTodayCount.textContent = "0";
        if (overviewOutOfStockCount) overviewOutOfStockCount.textContent = "-";
        if (overviewMostCommonReason) overviewMostCommonReason.textContent = "-";
        if (overviewStockWarning) overviewStockWarning.textContent = "Pregled je prilagođen korisniku koji nije admin.";
        return;
    }

    try {
        const response = await authFetch(`${baseUrl}/MedicationHistory/admin-dashboard-stats`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok) return;

        const overviewTodayCount = document.getElementById("overviewTodayCount");
        const overviewOutOfStockCount = document.getElementById("overviewOutOfStockCount");
        const overviewMostCommonReason = document.getElementById("overviewMostCommonReason");
        const overviewStockWarning = document.getElementById("overviewStockWarning");

        if (overviewTodayCount) overviewTodayCount.textContent = data.todayCount ?? 0;
        if (overviewOutOfStockCount) overviewOutOfStockCount.textContent = data.outOfStockCount ?? 0;

        if (overviewMostCommonReason) {
            overviewMostCommonReason.textContent =
                data.mostCommonReasonCount > 0 ? `${data.mostCommonReason} (${data.mostCommonReasonCount})` : "-";
        }

        if (overviewStockWarning) {
            if ((data.outOfStockCount ?? 0) > 0) {
                overviewStockWarning.textContent = `Potrebna reakcija: ${data.outOfStockCount} lijek(ova) je bez stanja.`;
            } else if ((data.lowStockCount ?? 0) > 0) {
                overviewStockWarning.textContent = `Pažnja: ${data.lowStockCount} lijek(ova) je pri kraju i treba planirati dopunu.`;
            } else {
                overviewStockWarning.textContent = "Nema kritičnih upozorenja. Zalihe su trenutno uredne.";
            }
        }
    } catch {
        console.log("Greška pri učitavanju admin pregleda.");
    }
}

async function loadAlerts() {
    const container = document.getElementById("alertsContent");
    if (!container) return;

    try {
        const response = await authFetch(`${baseUrl}/Medication/alerts`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok) {
            container.innerHTML = "<div class='item error'>Neuspješno učitavanje upozorenja.</div>";
            return;
        }

        renderAlerts(data);
    } catch {
        container.innerHTML = "<div class='item error'>Greška prilikom učitavanja upozorenja.</div>";
    }
}

function renderAlerts(data) {
    const container = document.getElementById("alertsContent");
    if (!container) return;

    const outOfStock = Array.isArray(data?.outOfStock) ? data.outOfStock : [];
    const lowStock = Array.isArray(data?.lowStock) ? data.lowStock : [];

    if (outOfStock.length === 0 && lowStock.length === 0) {
        container.innerHTML = "<div class='success-banner'>Nema aktivnih upozorenja. Sve zalihe su trenutno uredne.</div>";
        return;
    }

    let html = "<div class='alerts-stack'>";

    if (outOfStock.length > 0) {
        html += `
            <div class="alert-banner danger">
                <div class="alert-title">Nema na stanju (${outOfStock.length})</div>
                <div class="alert-body">${outOfStock.map(item => item.name || item.Name || item).join(", ")}</div>
            </div>
        `;
    }

    if (lowStock.length > 0) {
        html += `
            <div class="alert-banner warning">
                <div class="alert-title">Pri kraju (${lowStock.length})</div>
                <div class="alert-body">${lowStock.map(item => `${item.name || item.Name} (${item.stock ?? item.Stock})`).join(", ")}</div>
            </div>
        `;
    }

    html += "</div>";
    container.innerHTML = html;

    const headline = document.getElementById("overviewHeadline");
    if (headline) {
        if (outOfStock.length > 0) {
            headline.textContent = `Trenutno postoji ${outOfStock.length} lijek(ova) koji nisu na stanju i potrebna je brza reakcija.`;
        } else if (lowStock.length > 0) {
            headline.textContent = `${lowStock.length} lijek(ova) je pri kraju i preporučuje se dopuna zaliha.`;
        } else {
            headline.textContent = "Zalihe su uredne i nema aktivnih upozorenja.";
        }
    }
}

async function loadUsersSafeForOverview() {
    const user = getStoredUser();
    const totalUsers = document.getElementById("totalUsers");

    if (user?.role === "admin") {
        await loadUsers();
    } else if (totalUsers) {
        totalUsers.textContent = "-";
    }
}

async function loadAllDashboardData() {
    await Promise.all([
        loadUsersSafeForOverview(),
        loadMedications(),
        loadHistory(),
        loadOverviewTopMedicationSummary(),
        loadAdminDetailedStats(),
        loadAlerts()
    ]);

    await refreshAnalyticsIfVisible();
}

async function refreshAnalyticsIfVisible() {
    const statsSection = document.getElementById("statsSection");
    if (statsSection && !statsSection.classList.contains("hidden")) {
        await loadStats();
    }
}

async function loadStats() {
    await Promise.all([
        loadMedicationTrendChart(),
        loadTopUsersChart(),
        loadDetailedChart()
    ]);
}

async function loadCurrentUser() {
    try {
        const response = await authFetch(`${baseUrl}/User/me`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok) return;

        const current = getStoredUser();
        if (!current) return;

        saveUser({
            ...current,
            id: data.id,
            username: data.username,
            role: data.role,
            mustChangePassword: data.mustChangePassword
        });
    } catch {
        console.log("Nije moguće učitati trenutnog korisnika.");
    }
}



function openTakeMedicationModal(id, name, stock) {
    const modal = document.getElementById("takeMedicationModal");
    const nameEl = document.getElementById("takeMedicationName");
    const stockEl = document.getElementById("takeMedicationStock");
    const idEl = document.getElementById("takeMedicationId");
    const select = document.getElementById("takeReasonSelect");
    const custom = document.getElementById("takeReasonCustom");
    const qty = document.getElementById("takeMedicationQuantity");

    if (idEl) idEl.value = id;
    if (nameEl) nameEl.textContent = name || "-";
    if (stockEl) stockEl.textContent = `${stock} kom`;
    if (qty) {
        qty.value = "1";
        qty.max = String(Math.max(1, Number(stock || 1)));
    }
    if (select) select.value = "";
    if (custom) {
        custom.value = "";
        custom.classList.add("hidden");
    }
    updateTakeReasonPreview();
    setMessage("takeResult", "");

    modal?.classList.remove("hidden");
    syncBodyModalState();
}

function closeTakeMedicationModal() {
    const modal = document.getElementById("takeMedicationModal");
    modal?.classList.add("hidden");
    syncBodyModalState();

    const idEl = document.getElementById("takeMedicationId");
    const nameEl = document.getElementById("takeMedicationName");
    const stockEl = document.getElementById("takeMedicationStock");
    const select = document.getElementById("takeReasonSelect");
    const custom = document.getElementById("takeReasonCustom");
    const qty = document.getElementById("takeMedicationQuantity");

    if (idEl) idEl.value = "";
    if (nameEl) nameEl.textContent = "-";
    if (stockEl) stockEl.textContent = "-";
    if (qty) {
        qty.value = "1";
        qty.removeAttribute("max");
    }
    if (select) select.value = "";
    if (custom) {
        custom.value = "";
        custom.classList.add("hidden");
    }
    updateTakeReasonPreview();
    setMessage("takeResult", "");
}

async function confirmTakeMedication() {
    const id = parseInt(document.getElementById("takeMedicationId")?.value || "", 10);
    const reason = getSelectedReason();
    const quantity = parseInt(document.getElementById("takeMedicationQuantity")?.value || "1", 10);

    if (!id) {
        notify("takeResult", "Lijek nije pravilno odabran.", true);
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        notify("takeResult", "Količina mora biti najmanje 1.", true);
        return;
    }

    if (!reason) {
        notify("takeResult", "Odaberite ili unesite razlog prije potvrde.", true);
        return;
    }

    try {
        const response = await authFetch(`${baseUrl}/MedicationHistory/take`, {
            method: "POST",
            body: JSON.stringify({ medicationId: id, reason, quantity })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("takeResult", getErrorMessage(data, "Evidentiranje uzimanja nije uspjelo."), true);
            return;
        }

        notify("takeResult", `Evidentirano: ${data.name}. Uzimanje: ${data.quantity} kom. Trenutno stanje: ${data.stock}.`);
        await loadMedications();
        await loadHistory();
        await refreshAnalyticsIfVisible();
        await loadNotifications();

        setTimeout(() => {
            closeTakeMedicationModal();
        }, 600);
    } catch {
        notify("takeResult", "Greška prilikom evidentiranja uzimanja.", true);
    }
}




function toggleForgotPasswordBox() {
    const box = document.getElementById("forgotPasswordBox");
    if (!box) return;
    box.classList.toggle("hidden");
}

async function requestPasswordReset() {
    const usernameOrEmail = document.getElementById("forgotUsernameOrEmail")?.value.trim();

    if (!usernameOrEmail) {
        notify("forgotPasswordResult", "Unesite korisničko ime ili email.", true);
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/User/request-password-reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usernameOrEmail })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("forgotPasswordResult", getErrorMessage(data, "Zahtjev za reset lozinke nije uspio."), true);
            return;
        }

        notify("forgotPasswordResult", data?.message || "Ako račun postoji, poslali smo email za reset lozinke.");

        const input = document.getElementById("forgotUsernameOrEmail");
        if (input) input.value = "";
    } catch {
        notify("forgotPasswordResult", "Greška prilikom slanja zahtjeva za reset lozinke.", true);
    }
}
function getResetTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
}

function initializeResetPasswordPage() {
    const resultEl = document.getElementById("resetPasswordResult");
    if (!resultEl) return;

    const token = getResetTokenFromUrl();

    if (!token) {
        notify("resetPasswordResult", "Reset link nije ispravan ili token nedostaje.", true);
        return;
    }
}

async function submitResetPassword() {
    const token = getResetTokenFromUrl();
    const newPassword = document.getElementById("resetNewPassword")?.value.trim();
    const confirmPassword = document.getElementById("resetConfirmPassword")?.value.trim();

    if (!token) {
        notify("resetPasswordResult", "Reset link nije ispravan ili token nedostaje.", true);
        return;
    }

    if (!newPassword || !confirmPassword) {
        notify("resetPasswordResult", "Unesite novu lozinku i potvrdu lozinke.", true);
        return;
    }

    if (newPassword !== confirmPassword) {
        notify("resetPasswordResult", "Lozinke se ne podudaraju.", true);
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/User/confirm-password-reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token,
                newPassword
            })
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("resetPasswordResult", getErrorMessage(data, "Reset lozinke nije uspio."), true);
            return;
        }

        notify("resetPasswordResult", data?.message || "Lozinka je uspješno resetovana.");

        const newPasswordInput = document.getElementById("resetNewPassword");
        const confirmPasswordInput = document.getElementById("resetConfirmPassword");

        if (newPasswordInput) newPasswordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";

        setTimeout(() => {
            window.location.href = "/";
        }, 1800);
    } catch {
        notify("resetPasswordResult", "Greška prilikom potvrde resetovanja lozinke.", true);
    }
}
function toggleNotificationsPanel() {
    const panel = document.getElementById("notificationsPanel");
    if (!panel) return;
    panel.classList.toggle("hidden");
}

function closeNotificationsPanel() {
    const panel = document.getElementById("notificationsPanel");
    if (!panel) return;
    panel.classList.add("hidden");
}

function getNotificationTypeLabel(type) {
    switch ((type || "").toLowerCase()) {
        case "low_stock": return "Lijek pri kraju";
        case "out_of_stock": return "Nema na stanju";
        case "medication_taken": return "Uzimanje lijeka";
        case "import_summary": return "Import";
        case "password_reset": return "Reset lozinke";
        default: return "Obavijest";
    }
}

function getNotificationTypeIcon(type) {
    switch ((type || "").toLowerCase()) {
        case "low_stock": return "";
        case "out_of_stock": return "";
        case "medication_taken": return "";
        case "import_summary": return "";
        case "password_reset": return "";
        default: return "";
    }
}

function renderNotificationCards(targetId, items) {
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = "<div class='empty-state'>Nema novih obavijesti.</div>";
        return;
    }

    container.innerHTML = items.map(item => `
        <article class="notification-card ${item.isRead ? "" : "unread"}">
            <div class="notification-card-head">
                <div class="notification-icon notification-icon--empty"></div>
                <div>
                    <div class="notification-title">${item.title || getNotificationTypeLabel(item.type)}</div>
                    <div class="notification-text">${item.message || ""}</div>
                </div>
            </div>
            <div class="notification-meta">
                <span>${getNotificationTypeLabel(item.type)}</span>
                <span>${formatDate(item.createdAt)}</span>
            </div>
            ${item.isRead ? "" : `<div class="modal-actions modal-actions--notification"><button type="button" class="secondary-btn compact-btn" onclick="markNotificationAsRead(${item.id})">Označi kao pročitano</button></div>`}
        </article>
    `).join("");
}

function updateNotificationBadge(items) {
    const badge = document.getElementById("notificationBadge");
    if (!badge) return;

    const unread = Array.isArray(items) ? items.filter(x => !x.isRead).length : 0;
    badge.textContent = String(unread);
    badge.classList.toggle("hidden", unread === 0);
}

function applyNotificationsToUi(items) {
    latestNotificationsCache = Array.isArray(items) ? [...items] : [];
    const unreadOnly = latestNotificationsCache.filter(x => !x.isRead);
    renderNotificationCards("notificationsPanelList", unreadOnly.slice(0, 10));
    updateNotificationBadge(latestNotificationsCache);
}

async function loadNotifications() {
    const user = getStoredUser();
    if (!user?.token) return;

    try {
        const response = await authFetch(`${baseUrl}/Notification`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !Array.isArray(data)) return;

        applyNotificationsToUi(data);
    } catch {
        console.log("Notifikacije nisu učitane.");
    }
}

async function markNotificationAsRead(id) {
    try {
        const response = await authFetch(`${baseUrl}/Notification/${id}/read`, { method: "POST" });
        if (!response.ok) return;

        latestNotificationsCache = latestNotificationsCache.map(item =>
            item.id === id ? { ...item, isRead: true } : item
        );
        applyNotificationsToUi(latestNotificationsCache);
    } catch {
        console.log("Notifikacija nije označena.");
    }
}

async function markAllNotificationsAsRead() {
    try {
        const response = await authFetch(`${baseUrl}/Notification/read-all`, { method: "POST" });
        if (!response.ok) return;

        latestNotificationsCache = latestNotificationsCache.map(item => ({ ...item, isRead: true }));
        applyNotificationsToUi(latestNotificationsCache);
        showToast("Sve obavijesti su označene kao pročitane.");
    } catch {
        console.log("Notifikacije nisu označene.");
    }
}

function startNotificationPolling() {
    stopNotificationPolling();
    notificationPollInterval = window.setInterval(loadNotifications, 15000);
}

function stopNotificationPolling() {
    if (notificationPollInterval) {
        window.clearInterval(notificationPollInterval);
        notificationPollInterval = null;
    }
}


function syncNotificationMasterToggle(prefix = "") {
    const allToggle = document.getElementById(`${prefix}prefAllNotifications`) || document.getElementById(`${prefix}PrefAllNotifications`);
    if (!allToggle) return;

    const optionIds = [
        `${prefix}prefLowStock`,
        `${prefix}prefOutOfStock`,
        `${prefix}prefMedicationTaken`,
        `${prefix}prefImportSummary`,
        `${prefix}PrefLowStock`,
        `${prefix}PrefOutOfStock`,
        `${prefix}PrefMedicationTaken`,
        `${prefix}PrefImportSummary`
    ];

    const optionElements = optionIds
        .map(id => document.getElementById(id))
        .filter(Boolean);

    if (optionElements.length === 0) return;

    const checkedCount = optionElements.filter(el => el.checked).length;
    allToggle.checked = checkedCount === optionElements.length;
    allToggle.indeterminate = checkedCount > 0 && checkedCount < optionElements.length;

    optionElements.forEach(el => {
        el.disabled = !allToggle.checked && !allToggle.indeterminate && checkedCount === 0;
        const row = el.closest(".pref-item");
        if (row) row.classList.toggle("pref-item--disabled", el.disabled);
    });
}

function toggleAllNotificationOptions(prefix = "") {
    const allToggle = document.getElementById(`${prefix}prefAllNotifications`) || document.getElementById(`${prefix}PrefAllNotifications`);
    if (!allToggle) return;

    const optionIds = [
        `${prefix}prefLowStock`,
        `${prefix}prefOutOfStock`,
        `${prefix}prefMedicationTaken`,
        `${prefix}prefImportSummary`,
        `${prefix}PrefLowStock`,
        `${prefix}PrefOutOfStock`,
        `${prefix}PrefMedicationTaken`,
        `${prefix}PrefImportSummary`
    ];

    optionIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = allToggle.checked;
        el.disabled = !allToggle.checked;
        const row = el.closest(".pref-item");
        if (row) row.classList.toggle("pref-item--disabled", el.disabled);
    });

    allToggle.indeterminate = false;
}

function getNotificationPreferencePayload(prefix = "") {
    const allToggle = document.getElementById(`${prefix}prefAllNotifications`) || document.getElementById(`${prefix}PrefAllNotifications`);
    const everythingDisabled = allToggle && !allToggle.checked && !allToggle.indeterminate;

    return {
        receiveLowStockNotifications: everythingDisabled ? false : Boolean(document.getElementById(`${prefix}prefLowStock`)?.checked ?? document.getElementById(`${prefix}PrefLowStock`)?.checked),
        receiveOutOfStockNotifications: everythingDisabled ? false : Boolean(document.getElementById(`${prefix}prefOutOfStock`)?.checked ?? document.getElementById(`${prefix}PrefOutOfStock`)?.checked),
        receiveMedicationTakenNotifications: everythingDisabled ? false : Boolean(document.getElementById(`${prefix}prefMedicationTaken`)?.checked ?? document.getElementById(`${prefix}PrefMedicationTaken`)?.checked),
        receiveImportSummaryNotifications: everythingDisabled ? false : Boolean(document.getElementById(`${prefix}prefImportSummary`)?.checked ?? document.getElementById(`${prefix}PrefImportSummary`)?.checked)
    };
}

function getOnboardingStorageKey(userId) {
    return `clinicNotificationOnboarding_${userId}`;
}

function closeNotificationOnboarding() {
    document.getElementById("notificationOnboardingModal")?.classList.add("hidden");
    syncBodyModalState();
    notificationOnboardingShown = false;
}

async function maybeShowNotificationOnboarding() {
    const user = getStoredUser();
    if (!user?.token || !user?.id || user.mustChangePassword || notificationOnboardingShown) return;

    const key = getOnboardingStorageKey(user.id);
    if (localStorage.getItem(key) === "done") return;

    syncNotificationMasterToggle("onboarding", false);
    syncPushSubscriptionStatus();

    const modal = document.getElementById("notificationOnboardingModal");
    if (!modal) return;

    [
        ["prefLowStock", "onboardingPrefLowStock"],
        ["prefOutOfStock", "onboardingPrefOutOfStock"],
        ["prefMedicationTaken", "onboardingPrefMedicationTaken"],
        ["prefImportSummary", "onboardingPrefImportSummary"]
    ].forEach(([sourceId, targetId]) => {
        const source = document.getElementById(sourceId);
        const target = document.getElementById(targetId);
        if (source && target) target.checked = source.checked;
    });

    syncNotificationMasterToggle("onboarding");

    modal.classList.remove("hidden");
    syncBodyModalState();
    notificationOnboardingShown = true;
}

async function saveNotificationOnboarding(enablePushToo) {
    const payload = getNotificationPreferencePayload("onboarding");

    try {
        const response = await authFetch(`${baseUrl}/Notification/preferences`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
        const data = await safeJson(response);
        if (!response.ok) {
            notify("notificationOnboardingResult", getErrorMessage(data, "Spremanje postavki nije uspjelo."), true);
            return;
        }

        if (enablePushToo) {
            await enablePushNotifications(true);
        } else {
            await syncPushSubscriptionStatus();
        }

        const user = getStoredUser();
        if (user?.id) localStorage.setItem(getOnboardingStorageKey(user.id), "done");

        await loadNotificationPreferences();
        notify("notificationOnboardingResult", "Notifikacije su podešene.");
        setTimeout(closeNotificationOnboarding, 500);
    } catch {
        notify("notificationOnboardingResult", "Greška prilikom spremanja početnih postavki.", true);
    }
}

async function getPushPublicKey() {
    const response = await authFetch(`${baseUrl}/Notification/push-public-key`, { method: "GET" });
    const data = await safeJson(response);
    if (!response.ok || !data?.publicKey) throw new Error("Public key nije dostupna.");
    return data.publicKey;
}

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

async function getServiceWorkerRegistration() {
    if (!("serviceWorker" in navigator)) throw new Error("Service worker nije podržan.");
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return navigator.serviceWorker.register("/sw.js");
}

async function syncPushSubscriptionStatus() {
    const permissionEl = document.getElementById("pushPermissionStatus");
    const subscriptionEl = document.getElementById("pushSubscriptionStatus");
    const installBtn = document.getElementById("installPwaBtn");
    const pwaStatus = document.getElementById("pwaInstallStatus");
    const onboardingPermission = document.getElementById("onboardingPushPermissionStatus");
    const onboardingDevice = document.getElementById("onboardingPushDeviceStatus");

    const permissionText = !("Notification" in window) ? "Nije podržano" : (Notification.permission === "granted" ? "Odobreno" : Notification.permission === "denied" ? "Blokirano" : "Nije postavljeno");

    if (permissionEl) permissionEl.textContent = permissionText;
    if (onboardingPermission) onboardingPermission.textContent = permissionText;

    let subscriptionActive = false;
    if ("serviceWorker" in navigator) {
        try {
            const registration = await getServiceWorkerRegistration();
            const subscription = await registration.pushManager.getSubscription();
            subscriptionActive = Boolean(subscription);
        } catch { }
    }

    const subText = subscriptionActive ? "Aktivna na ovom uređaju" : "Nije aktivna";
    if (subscriptionEl) subscriptionEl.textContent = subText;
    if (onboardingDevice) onboardingDevice.textContent = subscriptionActive ? "Povezan uređaj" : "Nije povezan";

    if (pwaStatus) {
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) pwaStatus.textContent = 'Instalirana';
        else if (deferredInstallPrompt) pwaStatus.textContent = 'Dostupna za instalaciju';
        else pwaStatus.textContent = 'Nije trenutno dostupno';
    }
    if (installBtn) installBtn.classList.toggle('hidden', !deferredInstallPrompt);
}

async function saveBrowserPushSubscription(subscription) {
    const payload = {
        endpoint: subscription.endpoint,
        p256dh: subscription.toJSON().keys.p256dh,
        auth: subscription.toJSON().keys.auth,
        userAgent: navigator.userAgent
    };
    const response = await authFetch(`${baseUrl}/Notification/push-subscription`, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Spremanje push pretplate nije uspjelo.");
}

async function deleteBrowserPushSubscription(subscription) {
    if (!subscription) return;
    const response = await authFetch(`${baseUrl}/Notification/push-subscription`, {
        method: "DELETE",
        body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    if (!response.ok) throw new Error("Brisanje push pretplate nije uspjelo.");
}

async function enablePushNotifications(silent = false) {
    try {
        if (!("Notification" in window)) throw new Error("Browser ne podržava notifikacije.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Dozvola za notifikacije nije odobrena.");

        const registration = await getServiceWorkerRegistration();
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            const publicKey = await getPushPublicKey();
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
        }

        await saveBrowserPushSubscription(subscription);
        await syncPushSubscriptionStatus();
        if (!silent) showToast("Push notifikacije su uključene.");
    } catch (error) {
        if (!silent) showToast(error?.message || "Push notifikacije nisu uključene.", "error");
    }
}

async function disablePushNotifications() {
    try {
        const registration = await getServiceWorkerRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await deleteBrowserPushSubscription(subscription);
            await subscription.unsubscribe();
        }
        await syncPushSubscriptionStatus();
        showToast("Push notifikacije su isključene.", "warning");
    } catch {
        showToast("Push notifikacije nije moguće isključiti.", "error");
    }
}

async function promptInstallPwa() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    syncPushSubscriptionStatus();
}

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    syncPushSubscriptionStatus();
});
async function loadNotificationPreferences() {
    const user = getStoredUser();
    if (!user?.token) return;

    try {
        const response = await authFetch(`${baseUrl}/Notification/preferences`, { method: "GET" });
        const data = await safeJson(response);

        if (!response.ok || !data) return;

        const map = {
            prefLowStock: "receiveLowStockNotifications",
            prefOutOfStock: "receiveOutOfStockNotifications",
            prefMedicationTaken: "receiveMedicationTakenNotifications",
            prefImportSummary: "receiveImportSummaryNotifications"
        };

        Object.entries(map).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.checked = Boolean(data[key]);
        });

        syncNotificationMasterToggle();
    } catch {
        console.log("Preference notifikacija nisu učitane.");
    }
}

async function saveNotificationPreferences() {
    const payload = getNotificationPreferencePayload();

    try {
        const response = await authFetch(`${baseUrl}/Notification/preferences`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        const data = await safeJson(response);

        if (!response.ok) {
            notify("notificationPreferenceResult", getErrorMessage(data, "Spremanje postavki nije uspjelo."), true);
            return;
        }

        notify("notificationPreferenceResult", "Postavke notifikacija su sačuvane.");
    } catch {
        notify("notificationPreferenceResult", "Greška prilikom spremanja postavki.", true);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    setDateInputsToToday();

    const storedUser = getStoredUser();
    if (storedUser?.token) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
            await logout(true);
        }
    }

    updateAuthUI();
    handleHistoryRangeChange(false);

    const medSearch = document.getElementById("medSearch");
    const medStockFilter = document.getElementById("medStockFilter");
    const historyUserFilter = document.getElementById("historyUserFilter");
    const historyReasonFilter = document.getElementById("historyReasonFilter");
    const medicationExcelFile = document.getElementById("medicationExcelFile");
    const historyMedicationFilter = document.getElementById("historyMedicationFilter");
    const historyFromDate = document.getElementById("historyFromDate");
    const historyToDate = document.getElementById("historyToDate");

    medSearch?.addEventListener("input", debounceLoadMedications);
    medStockFilter?.addEventListener("change", loadMedications);

    historyUserFilter?.addEventListener("change", loadHistory);
    historyReasonFilter?.addEventListener("change", loadHistory);
    historyMedicationFilter?.addEventListener("change", loadHistory);
    historyFromDate?.addEventListener("change", loadHistory);
    historyToDate?.addEventListener("change", loadHistory);
    medicationExcelFile?.addEventListener("change", updateMedicationExcelFileLabel);

    document.getElementById("medTrendRange")?.addEventListener("change", () => {
        toggleCustomDateRow("medTrendRange", "medTrendCustomDates");
        loadMedicationTrendChart();
    });
    document.getElementById("medTrendGroupBy")?.addEventListener("change", loadMedicationTrendChart);
    document.getElementById("medTrendFromDate")?.addEventListener("change", loadMedicationTrendChart);
    document.getElementById("medTrendToDate")?.addEventListener("change", loadMedicationTrendChart);

    document.getElementById("topUsersRange")?.addEventListener("change", () => {
        toggleCustomDateRow("topUsersRange", "topUsersCustomDates");
        loadTopUsersChart();
    });
    document.getElementById("topUsersFromDate")?.addEventListener("change", loadTopUsersChart);
    document.getElementById("topUsersToDate")?.addEventListener("change", loadTopUsersChart);

    document.getElementById("detailedRange")?.addEventListener("change", () => {
        toggleCustomDateRow("detailedRange", "detailedCustomDates");
        loadDetailedChart();
    });
    document.getElementById("detailedGroupBy")?.addEventListener("change", loadDetailedChart);
    document.getElementById("detailedUserFilter")?.addEventListener("change", loadDetailedChart);
    document.getElementById("detailedMedicationFilter")?.addEventListener("change", loadDetailedChart);
    document.getElementById("detailedFromDate")?.addEventListener("change", loadDetailedChart);
    document.getElementById("detailedToDate")?.addEventListener("change", loadDetailedChart);

    document.getElementById("takeReasonSelect")?.addEventListener("change", toggleCustomReasonInput);
    document.getElementById("takeReasonCustom")?.addEventListener("input", updateTakeReasonPreview);
    updateTakeReasonPreview();

    document.addEventListener("click", (event) => {
        const panel = document.getElementById("notificationsPanel");
        const bell = document.querySelector(".notification-bell");
        if (!panel || panel.classList.contains("hidden")) return;
        if (panel.contains(event.target) || bell?.contains(event.target)) return;
        closeNotificationsPanel();
    });

    if ("serviceWorker" in navigator) {
        try { await getServiceWorkerRegistration(); } catch { }
    }
    syncPushSubscriptionStatus();

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMedicationModal();
            closeTakeMedicationModal();
            closeConfirmModal(false);
        }
    });
});
