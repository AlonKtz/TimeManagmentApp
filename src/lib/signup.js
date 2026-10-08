export function validateSignupInput({ email, password, name } = {}) {
  const normalized = {
    email: typeof email === 'string' ? email.trim().toLowerCase() : '',
    password: typeof password === 'string' ? password : '',
    name: typeof name === 'string' ? name.normalize('NFC').trim() : '',
  };

  if (!normalized.email || !normalized.password || !normalized.name) {
    return { error: 'נא למלא את כל השדות' };
  }
  if (normalized.name.length > 80 || /[\p{Cc}\p{Cf}]/u.test(normalized.name)) {
    return { error: 'השם חייב להכיל עד 80 תווים וללא תווי בקרה' };
  }
  if (normalized.password.length < 6) {
    return { error: 'הסיסמה חייבת להיות לפחות 6 תווים' };
  }
  if (normalized.password.length > 72) {
    return { error: 'הסיסמה ארוכה מדי (עד 72 תווים)' };
  }
  if (normalized.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    return { error: 'כתובת האימייל אינה תקינה (דוגמה: user@company.com)' };
  }
  return { value: normalized };
}

export function signupErrorMessage(response) {
  const error = response?.error;
  const message = String(error?.message || error?.msg || error || response?.msg || response?.message || '');
  const code = String(error?.code || response?.code || '');
  if (!message && !code) return null;
  if (/already registered|already exists|user_already_exists|email_exists/i.test(`${code} ${message}`)) {
    return 'כתובת האימייל כבר רשומה. התחבר במקום ליצור חשבון חדש.';
  }
  if (/invalid email|email_address_invalid/i.test(`${code} ${message}`)) {
    return 'כתובת האימייל אינה תקינה (דוגמה: user@company.com)';
  }
  if (/password.*(weak|short|length)|weak_password|password_too_short/i.test(`${code} ${message}`)) {
    return 'הסיסמה אינה עומדת בדרישות. יש לבחור סיסמה ארוכה יותר.';
  }
  if (/rate.?limit|too many requests|429/i.test(`${code} ${message}`)) {
    return 'נשלחו יותר מדי בקשות. המתן מעט ונסה שוב.';
  }
  return 'ההרשמה נכשלה עקב שגיאת שרת. נסה שוב מאוחר יותר.';
}

export async function submitSignup({ email, password, name, signUp }) {
  const validation = validateSignupInput({ email, password, name });
  if (validation.error) return validation;
  try {
    const response = await signUp(validation.value.email, validation.value.password, validation.value.name);
    const error = signupErrorMessage(response);
    if (error) return { error };
    if (!response?.access_token || !response?.user?.id) {
      return { error: 'ההרשמה לא הושלמה. נסה להתחבר אם כבר יש לך חשבון.' };
    }
    return { value: validation.value, session: response };
  } catch {
    return { error: 'לא ניתן להתחבר לשרת כרגע. בדוק את החיבור ונסה שוב.' };
  }
}
