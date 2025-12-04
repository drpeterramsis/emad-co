


export interface NFPEItem {
  id: string;
  sign: string;
  signAr: string;
  deficiency: string;
  deficiencyAr: string;
  food: string;
  foodAr: string;
}

export interface NFPESystem {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  items: NFPEItem[];
}

export const nfpeData: NFPESystem[] = [
  {
    id: "general",
    name: "General & Hydration",
    nameAr: "المسح العام والتروية",
    icon: "⚖️",
    items: [
      {
        id: "gen_wasting",
        sign: "Loss of weight, muscle, or fat stores",
        signAr: "فقدان الوزن، العضلات، أو مخازن الدهون",
        deficiency: "Protein, Calories",
        deficiencyAr: "البروتين، السعرات الحرارية",
        food: "High calorie & protein diet",
        foodAr: "نظام غذائي عالي السعرات والبروتين"
      },
      {
        id: "gen_growth",
        sign: "Growth retardation / Poor growth",
        signAr: "تأخر النمو / ضعف النمو",
        deficiency: "Protein, Calories, Vitamin A, Zinc",
        deficiencyAr: "البروتين، السعرات، فيتامين أ، الزنك",
        food: "Balanced diet, fortified foods",
        foodAr: "نظام غذائي متوازن، أطعمة مدعمة"
      },
      {
        id: "gen_edema",
        sign: "Edema (Ankles/Feet)",
        signAr: "وذمة (تورم الكاحل/القدمين)",
        deficiency: "Protein, Thiamin (B1)",
        deficiencyAr: "البروتين، الثيامين (ب1)",
        food: "Protein sources, Whole grains",
        foodAr: "مصادر البروتين، الحبوب الكاملة"
      },
      {
        id: "gen_skin_turgor",
        sign: "Poor Skin Turgor",
        signAr: "ضعف مرونة الجلد",
        deficiency: "Dehydration (Fluid)",
        deficiencyAr: "الجفاف (سوائل)",
        food: "Water, Electrolytes",
        foodAr: "الماء، الإلكتروليتات"
      },
      {
        id: "gen_urine_dark",
        sign: "Dark, concentrated urine",
        signAr: "بول داكن مركز",
        deficiency: "Dehydration",
        deficiencyAr: "الجفاف",
        food: "Fluids",
        foodAr: "السوائل"
      },
      {
        id: "gen_urine_light",
        sign: "Light, dilute urine",
        signAr: "بول فاتح مخفف",
        deficiency: "Overhydration",
        deficiencyAr: "فرط الإماهة",
        food: "Restrict fluids if needed",
        foodAr: "تقليل السوائل عند الحاجة"
      }
    ]
  },
  {
    id: "skin",
    name: "Skin",
    nameAr: "الجلد",
    icon: "✋",
    items: [
      {
        id: "skin_dermatitis",
        sign: "Dermatitis, Xerosis (Dry/Scaly)",
        signAr: "التهاب الجلد، الجفاف (قشري)",
        deficiency: "Fatty Acids (EFA), Vitamin A",
        deficiencyAr: "الأحماض الدهنية، فيتامين أ",
        food: "Fish, oils, carrots, sweet potato",
        foodAr: "الأسماك، الزيوت، الجزر، البطاطا"
      },
      {
        id: "skin_follicular",
        sign: "Follicular Hyperkeratosis (Gooseflesh)",
        signAr: "فرط التقرن الجريبي (جلد الوزة)",
        deficiency: "Vitamin C, Vitamin A",
        deficiencyAr: "فيتامين سي، فيتامين أ",
        food: "Citrus, peppers, liver, dairy",
        foodAr: "الحمضيات، الفلفل، الكبد، الألبان"
      },
      {
        id: "skin_petechiae",
        sign: "Petechiae / Ecchymosis (Bruising)",
        signAr: "نمشات دموية / كدمات",
        deficiency: "Vitamin C, Vitamin K",
        deficiencyAr: "فيتامين سي، فيتامين ك",
        food: "Citrus fruits, Leafy greens",
        foodAr: "الحمضيات، الخضروات الورقية"
      },
      {
        id: "skin_pellagra",
        sign: "Mosaic Dermatitis (Pellagra)",
        signAr: "التهاب جلدي فسيفسائي (بلاجرا)",
        deficiency: "Niacin (B3)",
        deficiencyAr: "النياسين (ب3)",
        food: "Meat, fish, poultry, whole grains",
        foodAr: "اللحوم، الأسماك، الدواجن، الحبوب الكاملة"
      },
      {
        id: "skin_healing",
        sign: "Poor Wound Healing / Pressure Ulcers",
        signAr: "ضعف التئام الجروح / قرح الفراش",
        deficiency: "Protein, Vitamin C, Zinc",
        deficiencyAr: "البروتين، فيتامين سي، الزنك",
        food: "High protein, citrus, meat",
        foodAr: "بروتين عالي، حمضيات، لحوم"
      },
      {
        id: "skin_acneiform",
        sign: "Acneiform rash / Skin lesions",
        signAr: "طفح يشبه حب الشباب / تقرحات",
        deficiency: "Zinc",
        deficiencyAr: "الزنك",
        food: "Meat, shellfish, seeds",
        foodAr: "اللحوم، المحار، البذور"
      }
    ]
  },
  {
    id: "hair_nails",
    name: "Hair & Nails",
    nameAr: "الشعر والأظافر",
    icon: "💅",
    items: [
      {
        id: "hair_dull",
        sign: "Hair: Dull, Lusterless, Easily Plucked",
        signAr: "الشعر: باهت، فاقد للمعان، سهل الاقتلاع",
        deficiency: "Protein",
        deficiencyAr: "البروتين",
        food: "High biological value protein",
        foodAr: "بروتين عالي القيمة البيولوجية"
      },
      {
        id: "hair_thin",
        sign: "Hair: Thin, Sparse, Dyspigmented",
        signAr: "الشعر: خفيف، متناثر، تغير في اللون",
        deficiency: "Copper, Protein",
        deficiencyAr: "النحاس، البروتين",
        food: "Organ meats, shellfish, nuts",
        foodAr: "لحوم الأعضاء، المحار، المكسرات"
      },
      {
        id: "hair_flag",
        sign: "Hair: Flag sign (Light/Dark bands)",
        signAr: "الشعر: علامة العلم (شرائط فاتحة/داكنة)",
        deficiency: "Protein, Copper",
        deficiencyAr: "البروتين، النحاس",
        food: "Protein, Copper sources",
        foodAr: "مصادر البروتين والنحاس"
      },
      {
        id: "hair_corkscrew",
        sign: "Hair: Corkscrew / Coiled (Menkes)",
        signAr: "الشعر: لولبي / ملفوف (مينكس)",
        deficiency: "Copper (Menkes Syn), Vit C",
        deficiencyAr: "النحاس (متلازمة مينكس)، فيتامين سي",
        food: "Copper sources (if def), Citrus",
        foodAr: "مصادر النحاس، الحمضيات"
      },
      {
        id: "nails_spoon",
        sign: "Nails: Koilonychia (Spoon-shaped)",
        signAr: "الأظافر: تقعر الأظافر (ملعقية)",
        deficiency: "Iron",
        deficiencyAr: "الحديد",
        food: "Red meat, liver, spinach",
        foodAr: "اللحوم الحمراء، الكبد، السبانخ"
      },
      {
        id: "nails_transverse",
        sign: "Nails: Transverse Ridging / Dull",
        signAr: "الأظافر: خطوط عرضية / باهتة",
        deficiency: "Protein",
        deficiencyAr: "البروتين",
        food: "Adequate protein intake",
        foodAr: "تناول بروتين كافٍ"
      },
      {
        id: "nails_pale",
        sign: "Nails: Pale / Poor blanching",
        signAr: "الأظافر: شاحبة / ضعف الامتلاء",
        deficiency: "Vitamin A, C",
        deficiencyAr: "فيتامين أ، سي",
        food: "Citrus, Carrots",
        foodAr: "الحمضيات، الجزر"
      },
      {
        id: "nails_splinter",
        sign: "Nails: Splinter Hemorrhages",
        signAr: "الأظافر: نزيف شظوي",
        deficiency: "Vitamin C",
        deficiencyAr: "فيتامين سي",
        food: "Citrus, peppers",
        foodAr: "الحمضيات، الفلفل"
      }
    ]
  },
  {
    id: "eyes",
    name: "Eyes",
    nameAr: "العيون",
    icon: "👁️",
    items: [
      {
        id: "eyes_pale",
        sign: "Pale Conjunctivae",
        signAr: "شحوب الملتحمة",
        deficiency: "Iron, Folate, B12",
        deficiencyAr: "الحديد، الفولات، ب12",
        food: "Iron/B12 rich foods",
        foodAr: "أطعمة غنية بالحديد وب12"
      },
      {
        id: "eyes_bitot",
        sign: "Bitot's Spots / Xerosis",
        signAr: "بقع بيتو / جفاف القرنية",
        deficiency: "Vitamin A",
        deficiencyAr: "فيتامين أ",
        food: "Liver, carrots, leafy greens",
        foodAr: "الكبد، الجزر، الخضروات الورقية"
      },
      {
        id: "eyes_angular",
        sign: "Angular Palpebritis",
        signAr: "التهاب زوايا الجفن",
        deficiency: "B6, Niacin, Riboflavin",
        deficiencyAr: "ب6، النياسين، الريبوفلافين",
        food: "B-complex sources",
        foodAr: "مصادر فيتامين ب"
      },
      {
        id: "eyes_lipid",
        sign: "Corneal Arcus / Xanthelasma",
        signAr: "قوس القرنية / لويحات صفراء",
        deficiency: "Hyperlipidemia",
        deficiencyAr: "فرط دهون الدم",
        food: "Low fat diet",
        foodAr: "نظام قليل الدهون"
      }
    ]
  },
  {
    id: "mouth",
    name: "Mouth & Oral Cavity",
    nameAr: "الفم والتجويف الفموي",
    icon: "👄",
    items: [
      {
        id: "lips_cheilosis",
        sign: "Lips: Cheilosis / Angular Stomatitis",
        signAr: "الشفاه: تشقق / التهاب الزوايا",
        deficiency: "Niacin, Riboflavin, B6",
        deficiencyAr: "النياسين، ريبوفلافين، ب6",
        food: "Meat, dairy, whole grains",
        foodAr: "اللحوم، الألبان، الحبوب الكاملة"
      },
      {
        id: "tongue_glossitis",
        sign: "Tongue: Glossitis / Atrophy / Magenta",
        signAr: "اللسان: التهاب / ضمور / لون أرجواني",
        deficiency: "B Vitamins (B2, B3, B9, B12), Iron",
        deficiencyAr: "فيتامينات ب، الحديد",
        food: "Animal products, fortified grains",
        foodAr: "منتجات حيوانية، حبوب مدعمة"
      },
      {
        id: "gums_bleeding",
        sign: "Gums: Spongy / Bleeding",
        signAr: "اللسة: إسفنجية / نازفة",
        deficiency: "Vitamin C",
        deficiencyAr: "فيتامين سي",
        food: "Fruits and vegetables",
        foodAr: "الفواكه والخضروات"
      },
      {
        id: "teeth_caries",
        sign: "Teeth: Caries / Mottled Enamel",
        signAr: "الأسنان: تسوس / تبقع المينا",
        deficiency: "Excess Sugar (Caries), Fluoride issues",
        deficiencyAr: "زيادة السكر (تسوس)، مشاكل الفلورايد",
        food: "Limit sugar / Check water",
        foodAr: "تقليل السكر / فحص الماء"
      }
    ]
  },
  {
    id: "face_neck",
    name: "Face & Neck",
    nameAr: "الوجه والرقبة",
    icon: "👤",
    items: [
      {
        id: "face_moon",
        sign: "Face: Diffuse Depigmentation / Moon Face",
        signAr: "الوجه: نقص تصبغ منتشر / وجه قمري",
        deficiency: "Protein (Calcium noted in PDF)",
        deficiencyAr: "البروتين (ذكر الكالسيوم بالملف)",
        food: "Protein rich diet",
        foodAr: "نظام غذائي غني بالبروتين"
      },
      {
        id: "face_paresthesia",
        sign: "Face: Facial Paresthesias",
        signAr: "الوجه: تنميل الوجه",
        deficiency: "Calcium",
        deficiencyAr: "الكالسيوم",
        food: "Dairy, calcium sources",
        foodAr: "الألبان، مصادر الكالسيوم"
      },
      {
        id: "nose_seborrhea",
        sign: "Nose: Seborrhea (Nasolabial)",
        signAr: "الأنف: دهنية (حول الأنف)",
        deficiency: "Riboflavin (B2), Pyridoxine (B6)",
        deficiencyAr: "ريبوفلافين (ب2)، بيريدوكسين (ب6)",
        food: "Dairy, eggs, organ meats",
        foodAr: "الألبان، البيض، لحوم الأعضاء"
      },
      {
        id: "neck_thyroid",
        sign: "Neck: Enlarged Thyroid (Goiter)",
        signAr: "الرقبة: تضخم الغدة الدرقية",
        deficiency: "Iodine",
        deficiencyAr: "اليود",
        food: "Iodized salt, seafood",
        foodAr: "الملح اليودي، المأكولات البحرية"
      },
      {
        id: "neck_parotid",
        sign: "Neck: Enlarged Parotids",
        signAr: "الرقبة: تضخم الغدة النكافية",
        deficiency: "Protein deficiency, Bulimia",
        deficiencyAr: "نقص البروتين، الشره المرضي",
        food: "Treat underlying cause",
        foodAr: "علاج السبب الأساسي"
      }
    ]
  },
  {
    id: "msk",
    name: "Musculoskeletal",
    nameAr: "الجهاز العضلي الهيكلي",
    icon: "🦴",
    items: [
      {
        id: "msk_rickets",
        sign: "Bones: Rickets / Osteomalacia",
        signAr: "العظام: الكساح / لين العظام",
        deficiency: "Vitamin D, Calcium",
        deficiencyAr: "فيتامين د، الكالسيوم",
        food: "Sunlight, fortified dairy",
        foodAr: "الشمس، الألبان المدعمة"
      },
      {
        id: "msk_epiphyseal",
        sign: "Bones: Epiphyseal Enlargement",
        signAr: "العظام: تضخم المشاش",
        deficiency: "Protein, Vitamin D",
        deficiencyAr: "البروتين، فيتامين د",
        food: "Balanced diet",
        foodAr: "نظام غذائي متوازن"
      },
      {
        id: "msk_muscle",
        sign: "Muscle: Wasting / Pain / Emaciation",
        signAr: "العضلات: هزال / ألم / نحافة شديدة",
        deficiency: "Protein, Calories, Thiamin",
        deficiencyAr: "البروتين، السعرات، الثيامين",
        food: "High calorie/protein, B1",
        foodAr: "سعرات/بروتين عالي، ب1"
      },
      {
        id: "msk_joints",
        sign: "Joints: Swollen / Painful",
        signAr: "المفاصل: تورم / ألم",
        deficiency: "Vitamin C, Thiamin",
        deficiencyAr: "فيتامين سي، الثيامين",
        food: "Vitamin C rich foods",
        foodAr: "أطعمة غنية بفيتامين سي"
      }
    ]
  },
  {
    id: "neuro",
    name: "Neurological",
    nameAr: "الجهاز العصبي",
    icon: "🧠",
    items: [
      {
        id: "neuro_conf",
        sign: "Neuro: Confusion / Dementia",
        signAr: "عصبي: ارتباك / خرف",
        deficiency: "Thiamin, B12, Niacin, B6",
        deficiencyAr: "الثيامين، ب12، النياسين، ب6",
        food: "B-complex supplementation",
        foodAr: "مكملات فيتامين ب"
      },
      {
        id: "neuro_paresthesia",
        sign: "Neuro: Paresthesias / Weakness",
        signAr: "عصبي: تنميل / ضعف",
        deficiency: "B12, Niacin, Thiamin",
        deficiencyAr: "ب12، النياسين، الثيامين",
        food: "Animal foods, dairy",
        foodAr: "أطعمة حيوانية، ألبان"
      },
      {
        id: "neuro_tetany",
        sign: "Neuro: Tetany",
        signAr: "عصبي: تيتاني (تشنج)",
        deficiency: "Calcium, Magnesium",
        deficiencyAr: "الكالسيوم، المغنيسيوم",
        food: "Dairy, nuts, magnesium sources",
        foodAr: "الألبان، المكسرات، مصادر المغنيسيوم"
      }
    ]
  },
  {
    id: "cardio",
    name: "Cardiovascular",
    nameAr: "القلب والأوعية",
    icon: "❤️",
    items: [
      {
        id: "cardio_heart",
        sign: "Cardiac: Heart Failure (Wet Beriberi)",
        signAr: "القلب: فشل القلب (بري بري رطب)",
        deficiency: "Thiamin (B1)",
        deficiencyAr: "الثيامين (ب1)",
        food: "Thiamin rich foods (Yeast, pork, grains)",
        foodAr: "أطعمة غنية بالثيامين (خميرة، حبوب)"
      }
    ]
  }
];