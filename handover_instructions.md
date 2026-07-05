# 📋 Project Handover & Setup Instructions (Personal Guide)

## 👥 Key Contacts & Emails
* **Jatin Sir:** `jatinthacker000@gmail.com`
* **Kaustubh:** `kaushtubh457@gmail.com`
* **Amit (You):** `pathak.amitkumar@hrjohnsonindia.com`

---

## ⚡ 1. Checklist for Handing Over the Repository

When you transfer the repository to Jatin Sir, make sure you complete these steps to prevent security leaks:

1. **Delete any local `.env` files** before pushing to GitHub (Done, already deleted from the local workspace).
2. **Commit your final changes** and push them to your repository:
   ```bash
   git add .
   git commit -m "Deploy: Updated print layout, rotating keys, and badge edit functionality"
   git push origin main
   ```
3. **Change the repository ownership** on GitHub (under Settings -> General -> Danger Zone -> Transfer Ownership) and transfer it to Jatin's username.

---

## 🛡️ 2. Firebase Rules to Paste
Paste this exact rules configuration in your **Firebase Console -> Firestore Database -> Rules** tab. It checks the hardcoded admin email list on the server side:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if the user's email is registered as an admin
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email.lower() in [
               'kaushtubh457@gmail.com', 
               'jatinthacker000@gmail.com', 
               'pathak.amitkumar@hrjohnsonindia.com'
             ];
    }

    // 1. Questions Collection
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write, delete: if isAdmin();
    }

    // 2. Question Batches Collection
    match /questionBatches/{batchId} {
      allow read: if request.auth != null;
      allow write, delete: if isAdmin();
    }

    // 3. Test Results Collection (Students save their results; only admins delete or edit)
    match /testResults/{resultId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if isAdmin();
    }

    // 4. Test Sessions Collection (Admins create sessions; students read them)
    match /testSessions/{sessionId} {
      allow read: if request.auth != null;
      allow write, delete: if isAdmin();
    }
  }
}
```

---

## 🔑 3. Vercel Environment Variables Configuration
Ensure these environment variables are set up in Vercel to allow the AI grader to function:

| Key Name | Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `YOUR_API_KEY` | Primary API Key (can be comma-separated) |
| `GEMINI_API_KEY_2` | `YOUR_SECOND_API_KEY` | Fallback Key (rotates automatically if Key 1 hits limits) |

---

## 🚀 4. Transferring Vercel Deployment (Checklist & Re-Linking)

Since you are using a free Hobby Vercel account, you cannot transfer projects directly. You must use the **"Disconnect and Re-link"** method:

### Part A: Disconnect Your Local Directory
Your local directory is linked to **your** Vercel account via a hidden `.vercel` metadata folder. To safely deploy it to Jatin Sir's Vercel account:
1. In PowerShell, delete the local `.vercel` metadata folder:
   ```powershell
   Remove-Item -Path .vercel -Recurse -Force -ErrorAction SilentlyContinue
   ```
2. Log out of Vercel CLI locally (if logged in):
   ```bash
   npx vercel logout
   ```

### Part B: Jatin Sir's Vercel Setup (For Jatin Sir)
Once Jatin Sir owns the repository on GitHub, he can set it up in **3 minutes**:
1. Log in to **Vercel** with his GitHub account.
2. Click **Add New** -> **Project**.
3. Import the transferred repository.
4. In the Project configuration screen:
   * Add the Environment Variable: `GEMINI_API_KEY` = your API Key.
   * Add `GEMINI_API_KEY_2` = fallback key.
5. Click **Deploy**. Vercel will create a new live website link (e.g., `nerd-tutors.vercel.app`) on his account.

---

## 📁 5. Key Files to Edit in the Future
* **`firebase-config.js`**: If you ever need to change the admin emails, add or remove them from the `ADMIN_EMAILS` array.
* **`admin.js`**: Controls the teacher's dashboard rendering, Excel question uploading, and manual score overrides.
* **`ocr-scan.html`**: Handles student test submission, image uploads, and `localStorage` form persistence.

---

## ⚙️ 6. Firebase Project Configuration Handover (For Jatin Sir)

Since the local application is currently tied to your personal Firebase project, Jatin Sir needs to replace the configuration keys in the frontend:

### Steps for Jatin Sir:
1. Go to **Firebase Console** and create a new project.
2. Under project settings, click **Add App** -> **Web App** to generate the configuration keys.
3. Open `firebase-config.js` and replace the values inside `firebaseConfig` object (lines 9-17) with his new keys:
   ```javascript
   const firebaseConfig = {
       apiKey: "JATIN_SIR_FIREBASE_API_KEY",
       authDomain: "jatin-sir-project.firebaseapp.com",
       projectId: "jatin-sir-project-id",
       storageBucket: "jatin-sir-project.appspot.com",
       messagingSenderId: "SENDER_ID",
       appId: "APP_ID",
       measurementId: "MEASUREMENT_ID"
   };
   ```
4. Enable **Email/Password** and **Google** sign-in providers in his Firebase Auth console.
5. Create the Firestore database in **Production Mode**, paste the security rules provided in **Section 2** above, and publish them.

---

## 📚 7. Customizing Subject-Specific AI Evaluation Prompts

The system automatically adjusts the AI's grading focus depending on the subject of the active test session (e.g. *Social Science*, *Economics*). 

These subject-specific instructions are located inside the serverless edge function:
👉 **File to edit:** `api/ocr-evaluate.js` (lines 119 to 134)

### How it works:
Inside the code, a block checks the session subject string (`subject` parameter sent by `ocr-scan.html`):

```javascript
let subjectSpecificInstructions = "";
const sub = (subject || "").toLowerCase();

if (sub.includes("economics")) {
    subjectSpecificInstructions = `
⚠️ SUBJECT-SPECIFIC EVALUATION CRITERIA (ECONOMICS):
- Pay specific focus to correct economic definitions, concepts, and logical relationships (e.g. inflation, nominal vs real GDP, supply/demand elasticity).
- Grade strictly on the precision of terminology used (e.g., base year vs current year pricing).
`;
} else if (sub.includes("social science") || sub.includes("history") || sub.includes("geography") || sub.includes("civics")) {
    subjectSpecificInstructions = `
⚠️ SUBJECT-SPECIFIC EVALUATION CRITERIA (SOCIAL SCIENCE / HISTORY / GEOGRAPHY):
- History: Grade strictly on accuracy of historical dates, timelines, and associations of events.
- Geography: Ensure specific focus is given to correct naming of locations, points, classifications, and geographic features.
- Civics/Government: Look for correct constitutional, legislative, and systemic civic terminology.
`;
}
```

If Jatin Sir wants to add a new subject (e.g., *Physics* or *Chemistry*) or adjust the criteria for History/Geography, he can simply add another `else if (sub.includes("your-subject"))` block with his customized evaluation rules. Vercel will automatically deploy the updated rules on the next commit!




