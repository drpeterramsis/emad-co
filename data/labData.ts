
export interface LabPanel {
    id: string;
    title: string;
    titleAr: string;
    tests: string[];
}

export const labPanels: LabPanel[] = [
    {
        id: 'initial',
        title: 'Initial / General Assessment',
        titleAr: 'التحاليل المبدئية',
        tests: [
            'CBC (Complete Blood Count)',
            'Serum Ferritin',
            'FBS (Fasting Blood Sugar)',
            'PP (Post Prandial Glucose)',
            'Lipid Profile',
            'Liver Enzymes (ALT, AST)',
            'Kidney Function (Creatinine, Urea)',
            'TSH',
            'Serum 25 OH Vit D'
        ]
    },
    {
        id: 'underweight',
        title: 'Underweight / Malnutrition',
        titleAr: 'حالات النحافة',
        tests: [
            'CBC',
            'Serum Ferritin',
            'Stool Analysis',
            'Albumin',
            '25 OH Vit D',
            'Total & Ionized Calcium (Ca+)',
            'H. Pylori in Stool',
            'Free T3 & TSH'
        ]
    },
    {
        id: 'digestive',
        title: 'Digestive Issues / GIT',
        titleAr: 'مشاكل الجهاز الهضمي',
        tests: [
            'CBC',
            'Serum Ferritin',
            'Stool Analysis',
            'Fecal H. Pylori Antigen',
            'Fecal Elastase',
            'Fecal Calprotectin',
            'Fecal Occult Blood'
        ]
    }
];

export interface LabTestItem {
    category: string;
    test: string;
    normal: string;
    increase?: string;
    decrease?: string;
}

export const labTestsEncyclopedia: LabTestItem[] = [
    // Vitals & General
    { category: 'Vitals', test: 'Heart Rate', normal: '60-90 beat/min', increase: 'Tachycardia, Stress, Fever, Anemia', decrease: 'Bradycardia, Athletes, Hypothyroidism' },
    { category: 'Vitals', test: 'Respiratory Rate', normal: '12-15 breath/min', increase: 'Asthma, Pneumonia, Anxiety', decrease: 'Opioids, Brain injury' },
    { category: 'Vitals', test: 'Blood Pressure', normal: '120/80 mmHg', increase: 'Hypertension, Stress', decrease: 'Hypotension, Shock, Dehydration' },
    { category: 'Vitals', test: 'BMI', normal: '18.5 - 24.9', increase: 'Obesity 🍔', decrease: 'Underweight 📉' },
    
    // Blood Glucose
    { category: 'Diabetes', test: 'Fasting Blood Sugar (FBS)', normal: '3.5 - 6 mmol/L (70-100 mg/dl)', increase: 'Diabetes, Stress, Cushing\'s', decrease: 'Insulin overdose, Starvation' },
    { category: 'Diabetes', test: 'Post-Prandial (PP)', normal: '< 140 mg/dl', increase: 'Diabetes, Insulin Resistance', decrease: 'Reactive Hypoglycemia' },
    { category: 'Diabetes', test: 'HbA1C', normal: '4 - 5.6 %', increase: 'Poorly controlled Diabetes', decrease: 'Anemia, Hemolysis' },
    { category: 'Diabetes', test: 'Daily Insulin Sec', normal: '40-50 unit/day', increase: 'Insulin Resistance', decrease: 'Type 1 Diabetes' },

    // Lipid Profile
    { category: 'Lipids', test: 'Total Cholesterol', normal: '150 - 200 mg/dl', increase: 'Hypothyroidism, High fat diet, Genetics', decrease: 'Malnutrition, Hyperthyroidism' },
    { category: 'Lipids', test: 'LDL Cholesterol', normal: '< 130 mg/dl', increase: 'Atherosclerosis risk 🛑', decrease: 'Rare genetic disorders' },
    { category: 'Lipids', test: 'HDL Cholesterol', normal: '40 - 59 mg/dl', increase: 'Exercise, Genetics (Good) ✅', decrease: 'Smoking, Obesity, Sedentary' },
    { category: 'Lipids', test: 'Triglycerides (TAG)', normal: '< 150 mg/dl', increase: 'Obesity, Diabetes, Alcohol', decrease: 'Malnutrition' },

    // CBC & Hematology
    { category: 'Hematology', test: 'RBC (Male)', normal: '5 - 5.5 million/mm3', increase: 'Polycythemia, Dehydration', decrease: 'Anemia, Hemorrhage' },
    { category: 'Hematology', test: 'RBC (Female)', normal: '4 - 5 million/mm3', increase: 'Polycythemia, Dehydration', decrease: 'Anemia, Pregnancy' },
    { category: 'Hematology', test: 'Hemoglobin (Hb)', normal: 'M: 13.5-17.5 | F: 12-15.5 gm/dl', increase: 'Polycythemia, Smoking', decrease: 'Anemia (Iron, B12 def)' },
    { category: 'Hematology', test: 'WBC Total', normal: '4000 - 11000 /mm3', increase: 'Infection 🦠, Leukemia, Stress', decrease: 'Viral infection, Chemo, Aplastic anemia' },
    { category: 'Hematology', test: 'Platelets', normal: '1.5 - 4 lakhs/mm3', increase: 'Thrombocytosis, Inflammation', decrease: 'Dengue, ITP, Liver disease' },
    { category: 'Hematology', test: 'Neutrophils', normal: '50 - 70 %', increase: 'Bacterial Infection 🦠', decrease: 'Viral Infection, Chemo' },
    { category: 'Hematology', test: 'Lymphocytes', normal: '20 - 40 %', increase: 'Viral Infection, CLL', decrease: 'HIV, Steroids' },
    { category: 'Hematology', test: 'Eosinophils', normal: '1 - 4 %', increase: 'Allergy 🤧, Parasites 🪱', decrease: 'Steroid use' },
    { category: 'Hematology', test: 'MCV', normal: '76 - 96 fl', increase: 'Macrocytic Anemia (B12/Folate def)', decrease: 'Microcytic Anemia (Iron def)' },
    { category: 'Hematology', test: 'ESR (Male)', normal: '6-12 mm 1st hr', increase: 'Inflammation, Infection', decrease: 'Polycythemia, Sickle cell' },
    { category: 'Hematology', test: 'ESR (Female)', normal: '12-18 mm 1st hr', increase: 'Inflammation, Pregnancy', decrease: 'Polycythemia' },

    // Kidney Function
    { category: 'Kidney', test: 'Creatinine (M)', normal: '0.9 - 1.3 mg/dl', increase: 'Kidney Failure, High muscle mass', decrease: 'Muscle wasting (Elderly)' },
    { category: 'Kidney', test: 'Creatinine (F)', normal: '0.6 - 1.1 mg/dl', increase: 'Kidney Failure', decrease: 'Low muscle mass' },
    { category: 'Kidney', test: 'Urea', normal: '15 - 40 mg%', increase: 'Dehydration, Kidney disease, High protein', decrease: 'Liver failure, Low protein diet' },
    { category: 'Kidney', test: 'Uric Acid (M)', normal: '3 - 7 mg/dl', increase: 'Gout 🦶, Kidney stones', decrease: 'Liver disease' },
    
    // Liver & Proteins
    { category: 'Liver', test: 'Albumin', normal: '3.5 - 5 gm/dl', increase: 'Dehydration', decrease: 'Liver disease, Malnutrition, Nephrotic syn' },
    { category: 'Liver', test: 'Globulin', normal: '2.5 - 3.5 gm/dl', increase: 'Infection, Multiple Myeloma', decrease: 'Protein loss' },
    { category: 'Liver', test: 'Bilirubin Total', normal: '0.2 - 1.2 mg/dl', increase: 'Jaundice, Hepatitis, Hemolysis', decrease: '-' },
    { category: 'Liver', test: 'Ammonia', normal: '30 - 60 µgm/dl', increase: 'Severe Liver Disease (Hepatic Encephalopathy)', decrease: '-' },

    // Electrolytes
    { category: 'Electrolytes', test: 'Sodium (Na+)', normal: '135 - 145 mEq/L', increase: 'Dehydration, Diabetes Insipidus', decrease: 'Diuretics, Renal failure, SIADH' },
    { category: 'Electrolytes', test: 'Potassium (K+)', normal: '3.5 - 5 mEq/L', increase: 'Renal failure, Acidosis 🛑', decrease: 'Diarrhea, Vomiting, Diuretics' },
    { category: 'Electrolytes', test: 'Calcium (Ca)', normal: '8.5 - 10.5 mg/dl', increase: 'Hyperparathyroidism, Cancer', decrease: 'Vit D Deficiency, Renal failure' },
    { category: 'Electrolytes', test: 'Phosphorus', normal: '2.5 - 4.5 mg/dl', increase: 'Renal failure', decrease: 'Refeeding syndrome ⚠️, Vit D def' },
    { category: 'Electrolytes', test: 'Magnesium', normal: '1.7 - 2.2 mg/dl', increase: 'Renal failure', decrease: 'Diarrhea, Alcoholism' },

    // Thyroid & Hormones
    { category: 'Hormones', test: 'TSH', normal: '0.3 - 5 mIU/L', increase: 'Hypothyroidism 🐌', decrease: 'Hyperthyroidism 🐇' },
    { category: 'Hormones', test: 'Free T3', normal: '3 - 9 pmol/L', increase: 'Hyperthyroidism', decrease: 'Hypothyroidism, Starvation' },
    { category: 'Hormones', test: 'Free T4', normal: '10 - 30 pmol/L', increase: 'Hyperthyroidism', decrease: 'Hypothyroidism' },
    { category: 'Hormones', test: 'Prolactin', normal: '1.4 - 24.2 ng/ml', increase: 'Pituitary tumor, Lactation, PCOS', decrease: '-' },

    // Iron Profile
    { category: 'Iron Profile', test: 'Serum Ferritin', normal: '20 - 200 µgm/L', increase: 'Inflammation, Hemochromatosis', decrease: 'Iron Deficiency Anemia' },
    { category: 'Iron Profile', test: 'Serum Iron', normal: '50 - 150 µgm/dl', increase: 'Iron overload', decrease: 'Iron Deficiency' },
    { category: 'Iron Profile', test: 'TIBC', normal: '300 - 400 µgm/dl', increase: 'Iron Deficiency', decrease: 'Chronic disease, Malnutrition' },

    // Blood Gases
    { category: 'Blood Gas', test: 'pH', normal: '7.35 - 7.45', increase: 'Alkalosis', decrease: 'Acidosis' },
    { category: 'Blood Gas', test: 'PaCO2', normal: '35 - 45 mmHg', increase: 'Respiratory Acidosis (COPD)', decrease: 'Respiratory Alkalosis (Hyperventilation)' },
    { category: 'Blood Gas', test: 'HCO3', normal: '22 - 28 mEq/L', increase: 'Metabolic Alkalosis', decrease: 'Metabolic Acidosis (DKA)' }
];
