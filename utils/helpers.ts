

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

export const formatCurrency = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const numberToArabicTafqeet = (number: number): string => {
  if (isNaN(number)) return '';
  
  // Simplified Tafqeet for common invoice ranges (0 - 999,999)
  // For production systems, a robust library like 'tafqit.js' is recommended.
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشر", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  const thousands = ["", "ألف", "ألفان", "ثلاثة آلاف", "أربعة آلاف", "خمسة آلاف", "ستة آلاف", "سبعة آلاف", "ثمانية آلاف", "تسعة آلاف"];

  let intPart = Math.floor(number);
  const decimalPart = Math.round((number - intPart) * 100);

  if (intPart === 0) return "صفر";

  let result = "";

  // Handle Thousands
  if (intPart >= 1000) {
    const k = Math.floor(intPart / 1000);
    if (k < 10) {
        result += thousands[k] + " ";
    } else {
        result += k + " ألف "; // Fallback for complex thousands
    }
    intPart %= 1000;
  }

  // Handle Hundreds
  if (intPart >= 100) {
    const h = Math.floor(intPart / 100);
    result += hundreds[h] + " ";
    intPart %= 100;
  }

  if (result !== "" && intPart > 0) result += "و";

  // Handle Tens and Ones
  if (intPart < 10) {
    result += ones[intPart];
  } else if (intPart >= 11 && intPart <= 19) {
    result += teens[intPart - 10];
  } else {
    const t = Math.floor(intPart / 10);
    const o = intPart % 10;
    if (o > 0) {
      result += ones[o] + " و" + tens[t];
    } else {
      result += tens[t];
    }
  }

  result += " جنيه مصري";

  if (decimalPart > 0) {
    result += " و " + decimalPart + " قرشاً";
  }

  return result.trim();
};
