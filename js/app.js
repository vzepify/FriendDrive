const {
    createClient
} = supabase;

console.log("FriendDrive starting...");
console.log("Supabase:", supabaseClient);


/* =========================================================
   AUTH
========================================================= */

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


/* =========================================================
   LOGIN
========================================================= */

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


/* =========================================================
   SIGN UP
========================================================= */

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


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    showLogin();

});


/* =========================================================
   AUTH STATE
========================================================= */

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


/* =========================================================
   FILE STATE
========================================================= */

let currentFiles = new Map();


/* =========================================================
   FILE LOADING
========================================================= */

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


/* =========================================================
   FILE TYPE HELPERS
========================================================= */

function isVideo(file) {

    if (!file) {
        return false;
    }

    if (
        file.mime_type &&
        file.mime_type.toLowerCase().startsWith("video/")
    ) {
        return true;
    }

    const name =
        String(file.name || "").toLowerCase();

    return (
        name.endsWith(".mp4") ||
        name.endsWith(".webm") ||
        name.endsWith(".ogg") ||
        name.endsWith(".ogv") ||
        name.endsWith(".mov") ||
        name.endsWith(".m4v") ||
        name.endsWith(".avi") ||
        name.endsWith(".mkv")
    );

}


function getFileIcon(file) {

    if (file.type === "folder") {
        return "📁";
    }

    if (isVideo(file)) {
        return "🎬";
    }

    if (
        file.mime_type &&
        file.mime_type.startsWith("image/")
    ) {
        return "🖼️";
    }

    if (
        file.mime_type === "application/pdf"
    ) {
        return "📕";
    }

    return "📄";
}


/* =========================================================
   RENDER FILES
========================================================= */

function renderFiles(files) {

    const container =
        document.getElementById("files");

    const empty =
        document.getElementById("empty");

    container.innerHTML = "";

    currentFiles.clear();

    if (!files.length) {

        empty.classList.remove("hidden");

        return;
    }

    empty.classList.add("hidden");

    for (const file of files) {

        currentFiles.set(
            String(file.id),
            file
        );

        const element =
            document.createElement("article");

        element.className =
            "file " + (file.type || "file");

        element.dataset.fileId =
            String(file.id);

        const video =
            isVideo(file);

        element.innerHTML = `

            <div
                class="file-icon"
                data-action="preview"
                title="${video ? "Play video" : ""}"
            >
                ${getFileIcon(file)}
            </div>

            <div
                class="file-name"
                title="${escapeHtml(file.name)}"
            >
                ${escapeHtml(file.name)}
            </div>

            <div class="file-meta">

                ${
                    file.type === "folder"
                        ? "Folder"
                        : formatSize(file.size)
                }

            </div>

            <button
                class="file-menu"
                data-action="menu"
                type="button"
                aria-label="File options"
            >
                ⋮
            </button>

            <div
                class="file-menu-dropdown hidden"
                data-menu
            >

                ${
                    video
                        ? `
                            <button
                                type="button"
                                data-action="preview"
                            >
                                ▶ Preview
                            </button>
                        `
                        : ""
                }

                ${
                    file.type !== "folder"
                        ? `
                            <button
                                type="button"
                                data-action="download"
                            >
                                ↓ Download
                            </button>
                        `
                        : ""
                }

            </div>

        `;

        container.appendChild(element);

    }

}


/* =========================================================
   FILE CARD EVENTS
========================================================= */

document
    .getElementById("files")
    .addEventListener("click", async event => {

        const fileCard =
            event.target.closest(".file");

        if (!fileCard) {
            return;
        }

        const fileId =
            fileCard.dataset.fileId;

        const file =
            currentFiles.get(fileId);

        if (!file) {
            return;
        }


        /* -----------------------------------------
           THREE DOT MENU
        ----------------------------------------- */

        const menuButton =
            event.target.closest(
                '[data-action="menu"]'
            );

        if (menuButton) {

            event.stopPropagation();

            closeAllFileMenus();

            const menu =
                fileCard.querySelector(
                    "[data-menu]"
                );

            menu.classList.toggle("hidden");

            return;
        }


        /* -----------------------------------------
           PREVIEW
        ----------------------------------------- */

        const previewButton =
            event.target.closest(
                '[data-action="preview"]'
            );

        if (previewButton) {

            closeAllFileMenus();

            if (isVideo(file)) {

                await previewVideo(file);

            }

            return;
        }


        /* -----------------------------------------
           DOWNLOAD
        ----------------------------------------- */

        const downloadButton =
            event.target.closest(
                '[data-action="download"]'
            );

        if (downloadButton) {

            closeAllFileMenus();

            await downloadFile(file);

            return;
        }

    });


/* =========================================================
   CLOSE FILE MENUS
========================================================= */

function closeAllFileMenus() {

    document
        .querySelectorAll("[data-menu]")
        .forEach(menu => {

            menu.classList.add("hidden");

        });

}


document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(".file-menu") &&
            !event.target.closest("[data-menu]")
        ) {

            closeAllFileMenus();

        }

    }
);


/* =========================================================
   SUPABASE SIGNED URL
========================================================= */

async function getFileUrl(file) {

    if (!file || !file.storage_path) {

        throw new Error(
            "This file does not have a storage path."
        );

    }

    const {
        data,
        error
    } = await supabaseClient.storage
        .from("files")
        .createSignedUrl(
            file.storage_path,
            3600
        );

    if (error) {

        console.error(
            "Could not create signed URL:",
            error
        );

        throw error;
    }

    if (!data || !data.signedUrl) {

        throw new Error(
            "Supabase did not return a file URL."
        );

    }

    return data.signedUrl;

}


/* =========================================================
   VIDEO PREVIEW
========================================================= */

async function previewVideo(file) {

    const modal =
        document.getElementById("modal");

    const modalBody =
        document.getElementById("modalBody");

    modalBody.innerHTML = `

        <div class="video-preview">

            <div class="video-preview-header">

                <div class="video-preview-title">
                    ${escapeHtml(file.name)}
                </div>

            </div>

            <div class="video-preview-loading">
                Loading video...
            </div>

        </div>

    `;

    modal.classList.remove("hidden");

    try {

        const url =
            await getFileUrl(file);

        modalBody.innerHTML = `

            <div class="video-preview">

                <div class="video-preview-header">

                    <div
                        class="video-preview-title"
                        title="${escapeHtml(file.name)}"
                    >
                        ${escapeHtml(file.name)}
                    </div>

                    <button
                        class="video-download-preview"
                        type="button"
                        data-preview-download
                    >
                        ↓ Download
                    </button>

                </div>

                <video
                    class="video-player"
                    controls
                    autoplay
                    playsinline
                    preload="metadata"
                >
                    <source
                        src="${escapeHtml(url)}"
                        type="${escapeHtml(
                            file.mime_type || "video/mp4"
                        )}"
                    >

                    Your browser does not support
                    HTML5 video playback.

                </video>

                <div class="video-preview-info">

                    ${escapeHtml(file.name)}

                    <span>
                        ${formatSize(file.size)}
                    </span>

                </div>

            </div>

        `;

        const video =
            modalBody.querySelector(
                ".video-player"
            );

        video.addEventListener(
            "error",
            () => {

                const errorBox =
                    document.createElement("div");

                errorBox.className =
                    "video-preview-error";

                errorBox.textContent =
                    "This video could not be played by your browser.";

                modalBody
                    .querySelector(".video-preview")
                    .appendChild(errorBox);

            }
        );


        const downloadButton =
            modalBody.querySelector(
                "[data-preview-download]"
            );

        downloadButton.addEventListener(
            "click",
            () => downloadFile(file)
        );

    } catch (error) {

        console.error(
            "Video preview failed:",
            error
        );

        modalBody.innerHTML = `

            <div class="preview-error">

                <h2>Couldn't open video</h2>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Something went wrong."
                    )}
                </p>

            </div>

        `;

    }

}


/* =========================================================
   DOWNLOAD FILE
========================================================= */

async function downloadFile(file) {

    try {

        const url =
            await getFileUrl(file);

        /*
         * Supabase signed URLs can be downloaded directly.
         * Using a temporary anchor keeps large videos
         * from being loaded entirely into browser memory.
         */

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            file.name || "download";

        link.target = "_blank";

        link.rel = "noopener";

        document.body.appendChild(link);

        link.click();

        link.remove();

        showToast(
            "Download started"
        );

    } catch (error) {

        console.error(
            "Download failed:",
            error
        );

        showToast(
            "Download failed: " +
            (
                error.message ||
                "Unknown error"
            )
        );

    }

}


/* =========================================================
   MODAL
========================================================= */

const modal =
    document.getElementById("modal");

const closeModal =
    document.getElementById("closeModal");


function closeModalWindow() {

    const video =
        modal.querySelector(
            ".video-player"
        );

    if (video) {

        video.pause();

        video.removeAttribute("src");

        video.load();

    }

    modalBody.innerHTML = "";

    modal.classList.add("hidden");

}


closeModal.addEventListener(
    "click",
    closeModalWindow
);


modal.addEventListener(
    "click",
    event => {

        if (
            event.target === modal
        ) {

            closeModalWindow();

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            !modal.classList.contains("hidden")
        ) {

            closeModalWindow();

        }

    }
);


/* =========================================================
   UPLOAD
========================================================= */

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


/* =========================================================
   UPLOAD FILE
========================================================= */

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
        .upload(
            path,
            file
        );

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


/* =========================================================
   DRAG AND DROP
========================================================= */

const dropzone =
    document.getElementById("dropzone");


if (dropzone) {

    dropzone.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            dropzone.classList.add("drag");

        }
    );


    dropzone.addEventListener(
        "dragleave",
        () => {

            dropzone.classList.remove("drag");

        }
    );


    dropzone.addEventListener(
        "drop",
        async event => {

            event.preventDefault();

            dropzone.classList.remove("drag");

            const files =
                [...event.dataTransfer.files];

            for (const file of files) {

                await uploadFile(file);

            }

            await loadFiles();

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

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
                .ilike(
                    "name",
                    `%${search}%`
                )
                .order("name");


            if (error) {

                console.error(error);

                return;

            }


            renderFiles(data);

        }
    );


/* =========================================================
   THEME
========================================================= */

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


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast =
        document.getElementById("toast");

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(
        showToast.timeout
    );

    showToast.timeout =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


/* =========================================================
   UTILITIES
========================================================= */

function escapeHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


function formatSize(bytes) {

    if (!bytes) {
        return "0 B";
    }

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
        Math.pow(
            1024,
            index
        )
    ).toFixed(
        index ? 1 : 0
    )
    + " "
    + units[index];

}


/* =========================================================
   START
========================================================= */

checkLogin();
