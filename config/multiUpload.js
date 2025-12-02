import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "avatar") {
      cb(null, "uploads/avatars/");
    } else if (file.fieldname === "achievementFiles") {
      cb(null, "uploads/achievements/");
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = uniqueSuffix + ext;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'avatar': ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
    'achievementFiles': ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  };

  if (!allowedTypes[file.fieldname]?.includes(file.mimetype)) {
    return cb(new Error(`Неподдерживаемый тип файла для ${file.fieldname}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Используем .fields() для обработки нескольких файловых полей
const multiUploadMiddleware = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "achievementFiles", maxCount: 10 }
]);

// Дополнительный middleware для парсинга JSON-строк из formData
const parseFormDataMiddleware = (req, res, next) => {
    // Функция для преобразования плоской структуры в вложенные объекты/массивы
    const parseNestedFields = (body) => {
      const result = {};
      
      Object.keys(body).forEach(key => {
        const value = body[key];
        
        // Обрабатываем вложенные структуры типа workExperience[0][title]
        if (key.includes('[') && key.includes(']')) {
          const matches = key.match(/(\w+)\[(\d+)\]\[(\w+)\]/);
          if (matches) {
            const [, fieldName, index, subField] = matches;
            
            if (!result[fieldName]) {
              result[fieldName] = [];
            }
            
            if (!result[fieldName][index]) {
              result[fieldName][index] = {};
            }
            
            result[fieldName][index][subField] = value;
          }
          
          // Обрабатываем структуры типа skills[0]
          const arrayMatches = key.match(/(\w+)\[(\d+)\]/);
          if (arrayMatches && !key.includes('[') && key.includes(']') && key.indexOf('[') < key.indexOf(']')) {
            const [, fieldName, index] = arrayMatches;
            
            if (!result[fieldName]) {
              result[fieldName] = [];
            }
            
            result[fieldName][index] = value;
          }
        } else {
          // Простые поля
          result[key] = value;
        }
      });
      
      // Очищаем массивы от undefined значений
      Object.keys(result).forEach(key => {
        if (Array.isArray(result[key])) {
          result[key] = result[key].filter(item => item !== undefined);
        }
      });
      
      return result;
    };
  
    // Преобразуем плоскую структуру formData в вложенные объекты
    const parsedBody = parseNestedFields(req.body);
    req.body = parsedBody;
  
    next();
  };

// Объединяем оба middleware
const combinedMiddleware = (req, res, next) => {
  multiUploadMiddleware(req, res, (err) => {
    if (err) return next(err);
    parseFormDataMiddleware(req, res, next);
  });
};

export default combinedMiddleware;