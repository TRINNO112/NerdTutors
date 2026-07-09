# Nerd Tutors Workspace Specifications

## 1. Evaluation & OCR Grading Standards (`api/ocr-evaluate.js`)
* **Strict Evaluation Standard:** The evaluation prompt MUST prioritize strict, objective moderator rules (strict MCQ option matches, zero marks for off-topic content, terminology/spelling check penalties, brevity caps, etc.). Do not relax these into proportional/moderate rubrics.
* **Safety Nets:** Clamping of individual scores to `[0, maxMarks]` and programmatic sum recalculation is enforced at the end of the API handler to ensure mathematical correctness.
* **Rephrased Model Answers:** The API schema expects a student-friendly, simplified 2-3 sentence `modelAnswer` based on the marking scheme.

## 2. Dashboard & Report Card Layout
* **Side-by-Side Split Panel:** The default report card preview and printed PDF layout (used in `results.html`, `ocr-scan.html`, `settings.html`, and `admin.js`) displays a split screen:
  * **Left Side:** Final Score block, grade/performance metrics, badge counts (Correct, Partial, Incorrect).
  * **Right Side:** Question-by-Question performance badges grid (Checks, Exclamations, Crosses) and dynamic legend.
* **Print Styling:**
  * `@page { margin: 0; }` must be used inside printing style blocks to hide the default browser headers (date/time) and footers (`about:blank`, page counts).
  * Page borders/margins must instead be styled inside the `body` tag using `padding: 10mm 15mm !important;`.
  * Ensure color backgrounds print by applying `-webkit-print-color-adjust: exact !important;` and `print-color-adjust: exact !important;`.
  * The evaluation date goes in the top metadata table (date-only via `.toLocaleDateString()`), and the detailed evaluation time (via `.toLocaleTimeString()`) is placed at the bottom of the left Final Score card to preserve clean formatting.

## 3. Data Export & Filtering Console (`dashboard.html` / `dashboard.js`)
* Use a clean, advanced filter box on the student dashboard that filters by Class (10th vs 12th) and dynamically updates available sessions.
* Export outputs as a single unified CSV containing structured test session details rather than multiple fragmented cards.
