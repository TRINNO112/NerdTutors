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
    draw.text((120, 75), f"Economics Grade 12 - Final 40-Marks Exam -- Page {page_number}/4", fill="#718096", font=font_body)

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
        "SECTION A: MACROECONOMICS (20 Marks)",
        "",
        "Q1. Which of the following is a stock variable? (1 Mark)",
        "Ans: (b) Wealth",
        "",
        "Q2. If MPC is 0.8, the value of investment multiplier is? (1 Mark)",
        "Ans: (a) 5",
        "",
        "Q3. Commercial banks create credit out of? (1 Mark)",
        "Ans: (c) Primary deposits",
        "",
        "Q4. Which of the following is not a quantitative tool of credit control? (1 Mark)",
        "Ans: (d) Bank Rate",
        "",
        "Q5. Deficit in Balance of Payments refers to? (1 Mark)",
        "Ans: (a) Receipts less than payments",
        "",
        "Q6. Distinguish between APC and MPC. (3 Marks)",
        "Ans: APC is the ratio of consumption to income (C/Y) at a point.",
        "MPC is the ratio of change in consumption to change in total income (dC/dY).",
        "APC can be greater than 1 at break-even point when consumption",
        "is more than income. MPC is always between 0 and 1 because we",
        "do not consume more than the change in income."
    ]

    page2_qa = [
        "Q7. Explain the process of credit creation by commercial banks. (4 Marks)",
        "Ans: Commercial banks create credit through primary deposits.",
        "If primary deposit is Rs 1000 and LRR is 20%, the bank keeps",
        "Rs 200 as reserve and lends Rs 800. This Rs 800 is deposited in",
        "another bank, which keeps 20% (Rs 160) and lends Rs 640.",
        "Total money created is Primary Deposit * (1/LRR) = 1000 * 5 = Rs 5000.",
        "",
        "Q8. Calculate equilibrium Income (Y) and Consumption (C)",
        "    if C = 100 + 0.8Y and Investment (I) = 500. (8 Marks)",
        "Ans: (a) At equilibrium, Y = C + I",
        "    Y = 100 + 0.8Y + 500",
        "    Y - 0.8Y = 600",
        "    0.2Y = 600",
        "    Y = 600 / 0.2 = 3000.",
        "    Equilibrium level of income is 3000.",
        "",
        "    (b) Consumption expenditure at equilibrium C:",
        "    C = 100 + 0.8(3000)",
        "    C = 100 + 2400 = 2500.",
        "    Consumption expenditure is 2500."
    ]

    page3_qa = [
        "SECTION B: INDIAN ECONOMIC DEVELOPMENT (20 Marks)",
        "",
        "Q9. The planning commission was set up in which year? (1 Mark)",
        "Ans: (b) 1950",
        "",
        "Q10. NABARD was established in? (1 Mark)",
        "Ans: (a) 1982",
        "",
        "Q11. Which country has the highest density of population? (1 Mark)",
        "Ans: (c) China",
        "",
        "Q12. Great Leap Forward campaign was initiated in China in? (1 Mark)",
        "Ans: (d) 1958",
        "",
        "Q13. First industrial policy resolution was passed in? (1 Mark)",
        "Ans: (b) 1948",
        "",
        "Q14. Explain the state of Indian agriculture on the eve of independence. (3 Marks)",
        "Ans: Agriculture was very backward because of the Zamindari system.",
        "Zamindars took high rents from peasants but did not invest anything",
        "to improve the land. There was no technology, no irrigation, and",
        "high dependence on rainfall, which led to low productivity and famines."
    ]

    page4_qa = [
        "Q15. Discuss the role of human capital formation in economic growth. (4 Marks)",
        "Ans: Human capital formation means investing in education and health.",
        "When people are educated, they learn new skills and use technology",
        "better, which increases productivity. Healthy workers can work for",
        "longer hours without falling sick. This increase in productivity and",
        "efficiency leads to higher GDP growth.",
        "",
        "Q16. Critical appraisal of the LPG policies of 1991. (8 Marks)",
        "Ans: The LPG reforms in 1991 had both positive and negative impacts.",
        "Positives: GDP growth rate increased significantly, foreign exchange",
        "reserves grew, and inflation was controlled. FDI flooded in, and",
        "consumers got access to global brands and better quality goods.",
        "Negatives: Reforms neglected the agricultural sector, leading to",
        "lower rural employment. Globalisation favored service and manufacturing",
        "sectors, increasing income inequality. Domestic industries faced tough",
        "competition from MNCs, and some small-scale firms shut down."
    ]

    page1_path = os.path.join(project_root, "final_exam_page1.png")
    page2_path = os.path.join(project_root, "final_exam_page2.png")
    page3_path = os.path.join(project_root, "final_exam_page3.png")
    page4_path = os.path.join(project_root, "final_exam_page4.png")

    generate_page(page1_path, "Amit Kumar Pathak", 1, page1_qa)
    generate_page(page2_path, "Amit Kumar Pathak", 2, page2_qa)
    generate_page(page3_path, "Amit Kumar Pathak", 3, page3_qa)
    generate_page(page4_path, "Amit Kumar Pathak", 4, page4_qa)

if __name__ == "__main__":
    generate_all_mock_pages()
