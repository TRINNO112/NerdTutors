# 📋 Project Handover & Setup Instructions (Personal Guide)

## 👥 Key Contacts & Emails
* **Jatin:** `jatinthacker000@gmail.com`
* **Kaustubh:** `kaushtubh457@gmail.com`
* **Amit (You):** `pathak.amitkumar@hrjohnsonindia.com`

---

## ⚡ 1. Checklist for Handing Over the Repository

When you transfer the repository to Jatin, make sure you complete these steps to prevent security leaks:

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

## 📁 4. Key Files to Edit in the Future
* **`firebase-config.js`**: If you ever need to change the admin emails, add or remove them from the `ADMIN_EMAILS` array.
* **`admin.js`**: Controls the teacher's dashboard rendering, Excel question uploading, and manual score overrides.
* **`ocr-scan.html`**: Handles student test submission, image uploads, and `localStorage` form persistence.
