import os
from PIL import Image, ImageDraw, ImageFont

def generate_page(output_path, student_name, page_number, questions_answers):
    width, height = 800, 1200
    img = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(img)

    # Ruled lines
    line_spacing = 35
    for y in range(120, height - 50, line_spacing):
        draw.line([(50, y), (width - 50, y)], fill="#d0e0fc", width=1)

    # Margin line
    draw.line([(100, 0), (100, height)], fill="#fcb6c5", width=2)

    try:
        font_path = "arial.ttf"
        font_title = ImageFont.truetype(font_path, 22)
        font_body = ImageFont.truetype(font_path, 16)
    except IOError:
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()

    # Header
    draw.text((120, 45), f"Student: {student_name}", fill="#2d3748", font=font_title)
    draw.text((120, 75), f"Economics Grade 12 - Final Exam -- Page {page_number}/2", fill="#718096", font=font_body)

    current_y = 135
    for line in questions_answers:
        color = "#12206b" if "Ans:" in line or line.startswith(" - ") or (not line.startswith("Q") and line != "") else "#2d3748"
        draw.text((120, current_y), line, fill=color, font=font_body)
        current_y += line_spacing

    img.save(output_path)
    print(f"Mock page {page_number} saved to: {output_path}")

def generate_all_mock_pages():
    project_root = r"d:\Trinno\NerdTutors"
    
    page1_qa = [
        "Q1. Define microeconomics. (2 Marks)",
        "Ans: Microeconomics is the study of the economy as a whole",
        "like national income and total employment. (WRONG)",
        "",
        "Q2. What is price elasticity of demand? (2 Marks)",
        "Ans: It measures how much the quantity demanded changes",
        "when the price changes.",
        "",
        "Q3. Explain the Law of Demand. (3 Marks)",
        "Ans: When price goes up, demand goes down. They have",
        "an inverse relationship.",
        "",
        "Q4. What is Perfect Competition? (3 Marks)",
        "Ans: A market where there are many buyers and sellers",
        "selling exactly the same product.",
        "",
        "Q5. Define Gross Domestic Product (GDP). (2 Marks)",
        "Ans: Total value of all goods and services produced in a",
        "country in a year."
    ]

    page2_qa = [
        "Q6. What is Marginal Propensity to Consume (MPC)? (2 Marks)",
        "Ans: It is the total consumption divided by total income. (WRONG - that is APC)",
        "",
        "Q7. What is the role of Central Bank as a banker's bank? (3 Marks)",
        "Ans: It gives loans to commercial banks when they need money",
        "and keeps their deposits safely.",
        "",
        "Q8. Difference between Direct and Indirect Taxes. (4 Marks)",
        "Ans: Direct taxes are paid directly to the government like GST.",
        "Indirect taxes are hidden taxes. (WRONG)",
        "",
        "Q9. What is Balance of Payments (BOP)? (2 Marks)",
        "Ans: Record of all money coming in and going out of the",
        "country through trade.",
        "",
        "Q10. Define Aggregate Demand. (2 Marks)",
        "Ans: It is the total demand for all goods and services in the economy."
    ]

    page1_path = os.path.join(project_root, "mohan_exam_page1.png")
    page2_path = os.path.join(project_root, "mohan_exam_page2.png")

    generate_page(page1_path, "Mohan", 1, page1_qa)
    generate_page(page2_path, "Mohan", 2, page2_qa)

if __name__ == "__main__":
    generate_all_mock_pages()
