

















export type Language = 'en' | 'ar';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'patient';
}

export interface SavedMeal {
  id: string;
  name: string;
  created_at: string;
  data: any; // JSON data of the meal plan
  tool_type: 'meal-planner' | 'meal-creator';
  user_id: string;
}

export interface DietaryAssessmentData {
  days: number;
  dates: string[]; // Array of date strings corresponding to days
  recall: {
    [key: string]: { // key is row id (e.g., 'breakfast')
      [day: string]: string; // day is 'day1', 'day2' -> value is text
    }
  };
}

export interface FoodQuestionnaireData {
  answers: {
    [key: string]: string; // key is question ID (e.g., 'red_meat'), value is frequency code (e.g., 'daily')
  };
  notes?: {
    [key: string]: string; // key is question ID, value is user note
  };
  updatedAt: string;
}

export interface Client {
  id: string;
  doctor_id: string;
  client_code?: string;
  full_name: string;
  visit_date: string;
  dob?: string;
  clinic: string;
  phone?: string;
  notes?: string;
  nfpe_data?: any;
  dietary_assessment?: DietaryAssessmentData; 
  food_questionnaire?: FoodQuestionnaireData; // New: JSON for Baseline FFQ
  age?: number;
  gender?: 'male' | 'female';
  marital_status?: string;
  kids_count?: number;
  job?: string;
  // Latest anthropometrics snapshot
  weight?: number;
  height?: number;
  head_circumference?: number; // New Pedia Field
  waist?: number;
  hip?: number;
  miac?: number;
  bmi?: number;
  created_at: string;
}

export interface ClientVisit {
  id: string;
  client_id: string;
  visit_date: string;
  weight?: number;
  height?: number;
  head_circumference?: number; // New Pedia Field
  waist?: number;
  hip?: number;
  miac?: number;
  bmi?: number;
  notes?: string;
  kcal_data?: any;
  meal_plan_data?: any;
  dietary_assessment?: DietaryAssessmentData;
  food_questionnaire?: FoodQuestionnaireData; // New: JSON for Visit FFQ
  created_at: string;
}

export interface Translation {
  common: {
    backHome: string;
    backToCalculator: string;
    explore: string;
    comingSoon: string;
    calculate: string;
    reset: string;
    close: string;
    open: string;
    viewAll: string;
    resetView: string;
    copyright: string;
    save: string;
    load: string;
    delete: string;
    edit: string;
    saveSuccess: string;
    loadSuccess: string;
    logout: string;
    loginRequired: string;
    locked: string;
    search: string;
    cancel: string;
    actions: string;
    back: string;
    apply: string;
  };
  auth: {
    loginTitle: string;
    signupTitle: string;
    email: string;
    password: string;
    fullName: string;
    role: string;
    doctor: string;
    patient: string;
    submitLogin: string;
    submitSignup: string;
    switchSignup: string;
    switchLogin: string;
    errorGeneric: string;
    successSignup: string;
  };
  header: {
    home: string;
    tools: string;
    login: string;
  };
  home: {
    welcome: string;
    subtitle: string;
  };
  tools: {
    bmi: {
      title: string;
      desc: string;
    };
    kcal: {
      title: string;
      desc: string;
    };
    mealCreator: {
      title: string;
      desc: string;
    };
    exchangeSimple: {
      title: string;
      desc: string;
    };
    exchangePro: {
      title: string;
      desc: string;
    };
    mealPlanner: {
      title: string;
      desc: string;
    };
    bmr: {
      title: string;
      desc: string;
    };
    clients: {
      title: string;
      desc: string;
    };
    nfpe: {
      title: string;
      desc: string;
    };
    encyclopedia: {
      title: string;
      desc: string;
    };
    heightEstimator: {
        title: string;
        desc: string;
    };
    labs: {
        title: string;
        desc: string;
    };
    strongKids: {
        title: string;
        desc: string;
    };
  };
  clients: {
    title: string;
    addClient: string;
    editClient: string;
    clientProfile: string;
    name: string;
    visitDate: string;
    clinic: string;
    phone: string;
    notes: string;
    age: string;
    gender: string;
    noClients: string;
    dietaryAssessment: string;
    foodQuestionnaire: string;
    labSuggestions: string;
    generateSummary: string;
  };
  kcal: {
    title: string;
    subtitle: string;
    personalInfo: string;
    weightInfo: string;
    methods: string;
    summary: string;
    weightAnalysis: string;
    quickActions: string;
    gender: string;
    male: string;
    female: string;
    age: string;
    height: string;
    waist: string;
    hip: string;
    whr: string;
    whtr: string;
    activity: string;
    selectActivity: string;
    currentWeight: string;
    selectedWeight: string;
    usualWeight: string;
    specialConditions: string;
    showConditions: string;
    hideConditions: string;
    duration: string;
    ascites: string;
    edema: string;
    method1: string;
    method2: string;
    method3: string;
    method1Desc: string;
    method2Desc: string;
    method3Desc: string;
    weightLoss: string;
    dryWeight: string;
    idealWeightSimple: string;
    idealWeightAccurate: string;
    adjustedWeight: string;
    deficit: string;
    kcalRequired: string;
    planMeals: string;
    activityLevels: {
      sedentary: string;
      mild: string;
      moderate: string;
      heavy: string;
      veryActive: string;
    };
    status: {
      underweight: string;
      normal: string;
      overweight: string;
      obese: string;
      healthy: string;
      slim: string;
      veryObese: string;
    };
    ageMode: string;
    manual: string;
    auto: string;
    dob: string;
    reportDate: string;
    calcAge: string;
    pediatricStatus: string;
    adultStatus: string;
    protocolCheck: string;
    threshold: string;
    recommendation: string;
    useAdjusted: string;
    useIdeal: string;
    amputations: string;
    amputationPercent: string;
    adjustedWeightAmp: string;
    ampItems: {
        hand: string;
        forearm: string;
        arm: string;
        foot: string;
        lowerLeg: string;
        leg: string;
    };
    bodyFat: string;
    bodyFatManual: string;
    bodyFatCalc: string;
    leanBodyMass: string;
    fatMass: string;
    targetWeightBF: string;
    desiredBodyFat: string;
    mac: string;
    tsf: string;
    mamc: string;
    estBmi: string;
    mm: string;
  };
  mealCreator: {
    searchPlaceholder: string;
    resetCreator: string;
    mealSummary: string;
    clear: string;
    foodName: string;
    group: string;
    serves: string;
    kcal: string;
    total: string;
    percentage: string;
    totalCalories: string;
    gm: string;
  };
  mealPlannerTool: {
    modeCalculator: string;
    modePlanner: string;
    modeBoth: string;
    addTotalKcalFirst: string;
    foodGroup: string;
    serves: string;
    cho: string;
    pro: string;
    fat: string;
    kcal: string;
    totals: string;
    targetKcal: string;
    remainKcal: string;
    calcKcal: string;
    manualTargetGm: string;
    manualTargetPerc: string;
    remainManual: string;
    targetGm: string;
    targetPerc: string;
    meals: {
      snack1: string;
      breakfast: string;
      snack2: string;
      lunch: string;
      snack3: string;
      dinner: string;
      snack4: string;
      remain: string;
    };
    groups: {
      starch: string;
      veg: string;
      fruit: string;
      meatLean: string;
      meatMed: string;
      meatHigh: string;
      milkSkim: string;
      milkLow: string;
      milkWhole: string;
      legumes: string;
      fats: string;
      sugar: string;
    }
  };
  encyclopedia: {
      searchPlaceholder: string;
      filterAll: string;
      filterVitamins: string;
      filterMinerals: string;
      function: string;
      sources: string;
      deficiency: string;
  };
  dietary: {
      title: string;
      days: string;
      date: string;
      meals: {
          breakfast: string;
          snack: string;
          lunch: string;
          dinner: string;
          water: string;
          sports: string;
      }
  };
  foodFreq: {
      title: string;
      daily: string;
      weekly3_4: string;
      weekly1_2: string;
      monthly1_2: string;
      monthlyLess: string;
      items: {
          home: string;
          withOthers: string;
          out: string;
          sweets: string;
          sugar: string;
          sweetener: string;
          teaCoffee: string;
          redMeat: string;
          eggs: string;
          fish: string;
          dairy: string;
          cheese: string;
          legumes: string;
          leafyVeg: string;
          coloredVeg: string;
          starchyVeg: string;
          starch: string;
          fruits: string;
          nuts: string;
          water: string;
      }
  };
  heightEst: {
      title: string;
      ulna: string;
      knee: string;
      weight: string;
      ulnaLength: string;
      kneeHeight: string;
      estimatedHeight: string;
      estimatedWeight: string;
      ageGroup: string;
      equation: string;
      chumlea: string;
      bapen: string;
      mac: string;
      cc: string;
      ssf: string;
      sisf: string;
  };
}