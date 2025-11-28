import { body, param } from 'express-validator';
import { handleValidationErrors } from '../error.validator.js';
import User from '../../models/User.model.js';

const checkEmailUnique = async (email) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Email уже используется');
  }
  return true;
};

const checkPhoneUnique = async (phoneNumber) => {
  if (!phoneNumber) return true;
  
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    throw new Error('Номер телефона уже используется');
  }
  return true;
};

const validatePhoneFormat = (value) => {
  if (!value) return true;

  const cleanPhone = value.replace(/\D/g, '');

  if (cleanPhone.startsWith('7') || cleanPhone.startsWith('8')) {
    if (cleanPhone.length !== 11) {
      throw new Error('Номер должен содержать 11 цифр');
    }
    return true;
  }

  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    throw new Error('Номер должен содержать от 10 до 15 цифр');
  }

  return true;
};

export const validateUserUpdate = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Имя обязательно')
    .isLength({ min: 2, max: 50 })
    .withMessage('Имя должно быть от 2 до 50 символов')
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('Имя может содержать только буквы, пробелы и дефисы'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Фамилия обязательна')
    .isLength({ min: 2, max: 50 })
    .withMessage('Фамилия должна быть от 2 до 50 символов')
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('Фамилия может содержать только буквы, пробелы и дефисы'),

  body('patronymic')
    .isLength({ min: 2, max: 50 })
    .withMessage('Отчество должно быть от 2 до 50 символов')
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('Отчество может содержать только буквы, пробелы и дефисы'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email адрес')
    .custom(checkEmailUnique),

  body('phoneNumber')
    .optional()
    .custom(validatePhoneFormat)
    .custom(checkPhoneUnique),

  body('about')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Описание должно быть не более 500 символов'),

  body('age')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Возраст должен быть от 0 до 100'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Город должен быть от 2 до 100 символов'),

  body('contacts.linkedin')
    .optional()
    .trim()
    .isURL()
    .withMessage('LinkedIn должен быть валидной ссылкой'),

  body('contacts.telegram')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Telegram должен быть от 2 до 100 символов'),

  body('contacts.github')
    .optional()
    .trim()
    .isURL()
    .withMessage('GitHub должен быть валидной ссылкой'),

  body('workExperience')
    .optional()
    .isArray()
    .withMessage('Опыт работы должен быть массивом'),
  
  body('workExperience.*.title')
    .trim()
    .notEmpty()
    .withMessage('Должность обязательна')
    .isLength({ max: 100 })
    .withMessage('Должность должна быть не более 100 символов'),

  body('workExperience.*.company')
    .trim()
    .notEmpty()
    .withMessage('Компания обязательна')
    .isLength({ max: 100 })
    .withMessage('Компания должна быть не более 100 символов'),

  body('workExperience.*.period')
    .trim()
    .notEmpty()
    .withMessage('Период работы обязателен')
    .isLength({ max: 50 })
    .withMessage('Период работы должен быть не более 50 символов'),

  body('workExperience.*.achievements')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Достижения должны быть не более 500 символов'),

  body('education')
    .optional()
    .isArray()
    .withMessage('Образование должно быть массивом'),
  
  body('education.*.degree')
    .trim()
    .notEmpty()
    .withMessage('Степень обязательна')
    .isLength({ max: 100 })
    .withMessage('Степень должна быть не более 100 символов'),

  body('education.*.field')
    .trim()
    .notEmpty()
    .withMessage('Направление обязательно')
    .isLength({ max: 100 })
    .withMessage('Направление должно быть не более 100 символов'),

  body('education.*.institution')
    .trim()
    .notEmpty()
    .withMessage('Учебное заведение обязательно')
    .isLength({ max: 100 })
    .withMessage('Учебное заведение должно быть не более 100 символов'),

  body('education.*.year')
    .isInt({ min: 1900, max: new Date().getFullYear() + 10 })
    .withMessage('Год должен быть валидным'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Навыки должны быть массивом'),
  
  body('skills.*')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Каждый навык должен быть от 1 до 50 символов'),

  body('languages')
    .optional()
    .isArray()
    .withMessage('Языки должны быть массивом'),
  
  body('languages.*.language')
    .trim()
    .notEmpty()
    .withMessage('Язык обязателен')
    .isLength({ max: 50 })
    .withMessage('Язык должен быть не более 50 символов'),

  body('languages.*.level')
    .isIn(['Beginner', 'Intermediate', 'Advanced', 'Native'])
    .withMessage('Неверный уровень владения языком'),

  body('projects')
    .optional()
    .isArray()
    .withMessage('Проекты должны быть массивом'),
  
  body('projects.*.link')
    .trim()
    .notEmpty()
    .withMessage('Ссылка на проект обязательна')
    .isURL()
    .withMessage('Ссылка на проект должна быть валидной'),
  
  body('projects.*.description')
    .trim()
    .notEmpty()
    .withMessage('Описание проекта обязательно')
    .isLength({ max: 500 })
    .withMessage('Описание проекта должно быть не более 500 символов'),

  body('socials')
    .optional()
    .isArray()
    .withMessage('Соцсети должны быть массивом'),
  
  body('socials.*.social')
    .trim()
    .notEmpty()
    .withMessage('Название соцсети обязательно')
    .isLength({ max: 50 })
    .withMessage('Название соцсети должно быть не более 50 символов'),

  body('socials.*.link')
    .trim()
    .notEmpty()
    .withMessage('Ссылка на соцсеть обязательна')
    .isURL()
    .withMessage('Ссылка на соцсеть должна быть валидной'),

  body('achievements')
    .optional()
    .isArray()
    .withMessage('Достижения должны быть массивом'),
  
  body('achievements.*.text')
    .trim()
    .notEmpty()
    .withMessage('Текст достижения обязателен')
    .isLength({ max: 500 })
    .withMessage('Текст достижения должен быть не более 500 символов'),

  body('industry')
    .optional()
    .isIn(['Web Development', 'Programming', 'Digital Design', 'Game Development', 'Information Security', 'Digital Marketing'])
    .withMessage('Неверная отрасль'),

  body('workFormat')
    .optional()
    .isIn(['On-site', 'Remote', 'Hybrid'])
    .withMessage('Неверный формат работы'),

  body('employmentType')
    .optional()
    .isIn(['Intern', 'Volunteer', 'Full-time', 'Part-time'])
    .withMessage('Неверный тип занятости'),

  body('status')
    .optional()
    .isIn(['Not looking', 'Open to offers', 'Actively searching'])
    .withMessage('Неверный статус поиска работы'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic должен быть true или false'),

  handleValidationErrors
];