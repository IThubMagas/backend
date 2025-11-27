import User from "../models/User.model.js";

/**
 * Получение списка пользователей с пагинацией и фильтрацией
 */
export async function getUsers(req, res) {
    try {
        // Получаем роли текущего пользователя и параметры запроса
        const userRoles = req.user.roles;
        const { industry, workFormat, employmentType, status, search } = req.query;

        // Настройка пагинации с защитой от невалидных значений
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100); // Ограничиваем максимум 100 записей
        const skip = (page - 1) * limit;

        // Базовый фильтр - показываем только публичные профили
        const filter = {
            isPublic: true
        };

        // Фильтрация по ролям: админы могут фильтровать по любой роли, остальные видят только студентов
        if (userRoles.includes("admin")) {
            if (req.query.role) {
                filter.roles = req.query.role;
            }
        } else {
            filter.roles = "student";
        }

        // Поиск по имени, фамилии или email (регистронезависимый)
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Фильтрация по отраслям (может быть несколько значений через запятую)
        if (industry) {
            const industries = industry.split(',').map(ind => ind.trim());
            filter.industry = { $in: industries };
        }

        // Фильтрация по формату работы
        if (workFormat) {
            const workFormats = workFormat.split(',').map(format => format.trim());
            filter.workFormat = { $in: workFormats };
        }

        // Фильтрация по типу занятости
        if (employmentType) {
            const employmentTypes = employmentType.split(',').map(type => type.trim());
            filter.employmentType = { $in: employmentTypes };
        }

        // Фильтрация по статусу
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            filter.status = { $in: statuses };
        }

        // Параллельное выполнение запросов для получения данных и общего количества
        const [users, total] = await Promise.all([
            User.find(filter)
                .skip(skip)
                .limit(limit)
                .select('firstName lastName patronymic avatar email contacts roles industry workFormat employmentType status skills workExperience education'),
            User.countDocuments(filter)
        ]);

        // Расчет данных для пагинации
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            users,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Не удалось получить список пользователей" });
        console.error(error);
    }
}

/**
 * Получение количества пользователей по фильтрам
 */
export async function getUsersCount(req, res) {
    try {
        const { status, industry } = req.query;
        const filter = {
            isPublic: true
        };

        // Фильтрация по статусу
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            filter.status = { $in: statuses };
        }

        // Фильтрация по отраслям
        if (industry) {
            const industries = industry.split(',').map(ind => ind.trim());
            filter.industry = { $in: industries };
        }

        const usersCount = await User.countDocuments(filter);
        res.status(200).json(usersCount);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при подсчете пользователей" });
        console.error(error);
    }
}

/**
 * Получение профиля конкретного пользователя по ID
 */
export async function getUser(req, res) {
    try {
        const { userId } = req.params;

        // Ищем пользователя, исключая чувствительные данные
        const user = await User.findById(userId)
            .select('-password -emailVerificationCode -emailVerificationCodeExpires -passwordResetCode -passwordResetCodeExpires');

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        // Проверяем права доступа
        const currentUserId = req.user.id;
        const isOwner = currentUserId === userId;
        const isAdmin = req.user.roles.includes('admin');

        // Если профиль не публичный, доступ есть только владельцу или админу
        if (!user.isPublic && !isOwner && !isAdmin) {
            return res.status(403).json({ message: "У вас нет доступа к этому профилю" });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Не удалось получить пользователя" });
        console.error(error);
    }
}

/**
 * Обновление данных пользователя
 */
export async function updateUser(req, res) {
    try {
        const { id } = req.user;
        const { userId } = req.params;
        const data = req.body;

        // Проверяем права на редактирование: либо свой профиль, либо админ
        if (id !== userId && !req.user.roles.includes('admin')) {
            return res.status(403).json({ message: "У вас нет доступа для редактирования этого профиля" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        // Белый список разрешенных для обновления полей
        const allowedFields = [
            'firstName', 'lastName', 'patronymic', 'phoneNumber', 'avatar',
            'contacts', 'workExperience', 'education', 'skills', 'industry',
            'workFormat', 'employmentType', 'status', 'languages', 'isPublic'
        ];

        // Фильтруем данные, оставляя только разрешенные поля
        const updateData = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        // Особенная логика для контактов: мержим существующие с новыми
        if (data.contacts) {
            updateData.contacts = { ...user.contacts, ...data.contacts };
        }

        // Обновляем пользователя с валидацией
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password -emailVerificationCode -emailVerificationCodeExpires -passwordResetCode -passwordResetCodeExpires');

        res.status(200).json({
            message: "Пользователь был успешно обновлён",
            user: updatedUser
        });
    } catch (error) {
        // Обработка специфических ошибок MongoDB
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Ошибка валидации данных", error: error.message });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: "Пользователь с таким email или номером телефона уже существует" });
        }
        res.status(500).json({ message: "Не удалось обновить пользователя" });
        console.error(error);
    }
}

/**
 * Удаление пользователя
 */
export async function deleteUser(req, res) {
    try {
        const { id } = req.user;
        const { userId } = req.params;

        // Проверяем права на удаление: либо свой профиль, либо админ
        if (id !== userId && !req.user.roles.includes('admin')) {
            return res.status(403).json({ message: "У вас нет доступа для удаления этого профиля" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: "Пользователь успешно удалён" });
    } catch (error) {
        res.status(500).json({ message: "Не удалось удалить пользователя" });
        console.error(error);
    }
}

/**
 * Получение профиля текущего авторизованного пользователя
 */
export async function getUserProfile(req, res) {
    try {
        const userId = req.user.id;

        // Получаем полные данные текущего пользователя (кроме чувствительных)
        const user = await User.findById(userId)
            .select('-password -emailVerificationCode -emailVerificationCodeExpires -passwordResetCode -passwordResetCodeExpires');

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Не удалось получить профиль" });
        console.error(error);
    }
}

/**
 * Обновление профиля текущего авторизованного пользователя
 */
export async function updateUserProfile(req, res) {
    try {
        const userId = req.user.id;
        const data = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        // Белый список разрешенных полей (аналогично updateUser)
        const allowedFields = [
            'firstName', 'lastName', 'patronymic', 'phoneNumber', 'avatar',
            'contacts', 'workExperience', 'education', 'skills', 'industry',
            'workFormat', 'employmentType', 'status', 'languages', 'isPublic'
        ];

        // Фильтруем данные
        const updateData = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        // Особенная логика для контактов
        if (data.contacts) {
            updateData.contacts = { ...user.contacts, ...data.contacts };
        }

        // Обновляем профиль
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password -emailVerificationCode -emailVerificationCodeExpires -passwordResetCode -passwordResetCodeExpires');

        res.status(200).json({
            message: "Профиль успешно обновлён",
            user: updatedUser
        });
    } catch (error) {
        // Обработка ошибок валидации и дубликатов
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Ошибка валидации данных", error: error.message });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: "Пользователь с таким email или номером телефона уже существует" });
        }
        res.status(500).json({ message: "Не удалось обновить профиль" });
        console.error(error);
    }
}