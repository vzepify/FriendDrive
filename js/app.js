const {
    createClient
} = supabase;

console.log("FriendDrive starting...");
console.log("Supabase:", supabaseClient);


/* =========================
   AUTH
========================= */

const authScreen = document.getElementById("authScreen");
const driveApp = document.getElementById("driveApp");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

const authError = document.getElementById("authError");

const logoutBtn = document.getElementById("logoutBtn");


function showAuthError(message) {

    authError.textContent = message;

    authError.classList.remove("hidden");

}


function clearAuthError() {

    authError.textContent = "";

    authError.classList.add("hidden");

}


function showDrive() {

    authScreen.classList.add("hidden");

    driveApp.classList.remove("hidden");

    loadFiles();

}


function showLogin() {

    driveApp.classList.add("hidden");

    authScreen.classList.remove("hidden");

}


loginBtn.addEventListener("click", async () => {

    clearAuthError();

    const email = emailInput.value.trim();

    const password = passwordInput.value;

    if (!email || !password) {

        showAuthError(
            "Enter your email and password."
        );

        return;

    }

    loginBtn.disabled = true;

    loginBtn.textContent = "Logging in...";


    const {
        error
    } = await supabaseClient.auth.signInWithPassword({

        email,

        password

    });


    loginBtn.disabled = false;

    loginBtn.textContent = "Log in";


    if (error) {

        showAuthError(error.message);

        return;

    }

    showDrive();

});


signupBtn.addEventListener("click", async () => {

    clearAuthError();

    const email = emailInput.value.trim();

    const password = passwordInput.value;


    if (!email || !password) {

        showAuthError(
            "Enter an email and password first."
        );

        return;

    }


    if (password.length < 6) {

        showAuthError(
            "Password must be at least 6 characters."
        );

        return;

    }


    signupBtn.disabled = true;

    signupBtn.textContent = "Creating account...";


    const {
        data,
        error
    } = await supabaseClient.auth.signUp({

        email,

        password

    });


    signupBtn.disabled = false;

    signupBtn.textContent = "Create an account";


    if (error) {

        showAuthError(error.message);

        return;

    }


    if (data.session) {

        showDrive();

    } else {

        showAuthError(
            "Account created! Check your email to confirm your account."
        );

    }

});


logoutBtn.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    showLogin();

});


/* =========================
   AUTH STATE
========================= */

async function checkLogin() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();


    if (session) {

        showDrive();

    } else {

        showLogin();

    }

}


supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        if (session) {

            showDrive();

        } else {

            showLogin();

        }

    }
);


/* =========================
   FILES
========================= */

async function loadFiles() {

    const {
        data,
        error
    } = await supabaseClient
        .from("files")
        .select("*")
        .eq("trashed", false)
        .order("name");


    if (error) {

        console.error(
            "Could not load files:",
            error
        );

        return;

    }


    console.log(
        "Files from Supabase:",
        data
    );


    renderFiles(data);

}


function renderFiles(files) {

    const container =
        document.getElementById("files");

    const empty =
        document.getElementById("empty");


    container.innerHTML = "";


    if (!files.length) {

        empty.classList.remove("hidden");

        return;

    }


    empty.classList.add("hidden");


    for (const file of files) {

        const element =
            document.createElement("article");


        element.className =
            "file " + file.type;


        element.innerHTML = `

            <div class="file-icon">
                ${file.type === "folder" ? "📁" : "📄"}
            </div>

            <div class="file-name">
                ${escapeHtml(file.name)}
            </div>

            <div class="file-meta">
                ${file.type === "folder"
                    ? "Folder"
                    : formatSize(file.size)}
            </div>

        `;


        container.appendChild(element);

    }

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatSize(bytes) {

    if (!bytes) return "0 B";

    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];

    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        bytes /
        Math.pow(1024, index)
    ).toFixed(index ? 1 : 0)
    + " "
    + units[index];

}


/* =========================
   UPLOAD
========================= */

const uploadBtn =
    document.getElementById("uploadBtn");

const fileInput =
    document.getElementById("fileInput");


uploadBtn.addEventListener(
    "click",
    () => fileInput.click()
);


fileInput.addEventListener(
    "change",
    async event => {

        const files =
            [...event.target.files];


        for (const file of files) {

            await uploadFile(file);

        }


        fileInput.value = "";

        await loadFiles();

    }
);


async function uploadFile(file) {

    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();


    if (!user) {

        showLogin();

        return;

    }


    const path =
        `${user.id}/${crypto.randomUUID()}-${file.name}`;


    const {
        error: uploadError
    } = await supabaseClient.storage
        .from("files")
        .upload(path, file);


    if (uploadError) {

        console.error(
            "Upload failed:",
            uploadError
        );

        alert(
            "Upload failed: " +
            uploadError.message
        );

        return;

    }


    const {
        error: databaseError
    } = await supabaseClient
        .from("files")
        .insert({

            owner_id: user.id,

            name: file.name,

            type: "file",

            mime_type: file.type,

            size: file.size,

            storage_path: path

        });


    if (databaseError) {

        console.error(
            databaseError
        );

        alert(
            "File uploaded but metadata failed: " +
            databaseError.message
        );

        return;

    }


    console.log(
        "Uploaded:",
        file.name
    );

}


/* =========================
   UI
========================= */

document
    .getElementById("themeBtn")
    .addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

        }
    );


document
    .getElementById("search")
    .addEventListener(
        "input",
        async event => {

            const search =
                event.target.value
                    .trim()
                    .toLowerCase();


            const {
                data,
                error
            } = await supabaseClient
                .from("files")
                .select("*")
                .eq("trashed", false)
                .ilike("name", `%${search}%`)
                .order("name");


            if (error) {

                console.error(error);

                return;

            }


            renderFiles(data);

        }
    );


/* =========================
   START
========================= */

checkLogin();
