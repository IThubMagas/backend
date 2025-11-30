import User from "../models/User.model.js";

// Получение списка пользователей с пагинацией и фильтрацией
async function getUsers(req, res) {
    try {
        const userRoles = req.user?.roles || []; 
        const { industry, workFormat, employmentType, status, search } = req.query;

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100); // Ограничение максимум 100 записей
        const skip = (page - 1) * limit;

        const filter = {
            isPublic: true
        };

        if (userRoles.includes("admin")) {
            if (req.query.role) {
                filter.roles = req.query.role;
            }
        } else {
            filter.roles = "student";
        }

        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (industry) {
            const industries = industry.split(',').map(ind => ind.trim());
            filter.industry = { $in: industries };
        }

        if (workFormat) {
            const workFormats = workFormat.split(',').map(format => format.trim());
            filter.workFormat = { $in: workFormats };
        }

        if (employmentType) {
            const employmentTypes = employmentType.split(',').map(type => type.trim());
            filter.employmentType = { $in: employmentTypes };
        }

        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            filter.status = { $in: statuses };
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .skip(skip)
                .limit(limit)
                .select('firstName lastName patronymic avatar email contacts roles industry workFormat employmentType status skills workExperience education'),
            User.countDocuments(filter)
        ]);

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


// Получение количества пользователей по фильтрам
async function getUsersCount(req, res) {
    try {
        const { status, industry } = req.query;
        const filter = {
            isPublic: true
        };

        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            filter.status = { $in: statuses };
        }

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

// Получение профиля конкретного пользователя по ID
async function getUser(req, res) {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .select('-password -emailVerificationCode -emailVerificationCodeExpires -passwordResetCode -passwordResetCodeExpires');

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const currentUserId = req.user?.id; 
        const isOwner = currentUserId === userId;
        const isAdmin = req.user?.roles?.includes('admin'); 

        if (!user.isPublic && !isOwner && !isAdmin) {
            return res.status(403).json({ message: "У вас нет доступа к этому профилю" });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Не удалось получить пользователя" });
        console.error(error);
    }
}


// Удаление пользователя
async function deleteUser(req, res) {
    try {
        const { id } = req.user;
        const { userId } = req.params;

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

// Получение профиля текущего авторизованного пользователя
async function getUserProfile(req, res) {
    try {
        const userId = req.user.id;

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

// Обновление профиля текущего авторизованного пользователя
async function updateUserProfile(req, res) {
    try {
        const userId = req.user.id;
        const data = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const allowedFields = [
            'firstName', 'lastName', 'patronymic', 'email', 'phoneNumber', 'avatar',
            'contacts', 'workExperience', 'education', 'skills', 'industry',
            'workFormat', 'employmentType', 'status', 'languages', 'isPublic',
            'about', 'age', 'city', 'projects', 'socials', 'achievements', 
        ];

        const updateData = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        let achievementsData = [];

        if (data.achievements) {
            if (typeof data.achievements === 'string') {
                try {
                    achievementsData = JSON.parse(data.achievements);
                } catch (error) {
                    console.error('Ошибка парсинга achievements:', error);
                    achievementsData = [];
                }
            } else if (Array.isArray(data.achievements)) {
                achievementsData = data.achievements;
            }
        }

        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                if (achievementsData[index]) {
                    achievementsData[index] = {
                        ...achievementsData[index],
                        file: file.filename || file.originalname,
                        text: achievementsData[index].description || achievementsData[index].title || 'Достижение'
                    };
                } else {
                    achievementsData.push({
                        title: `Достижение ${index + 1}`,
                        description: '',
                        date: new Date().toISOString().split('T')[0],
                        file: file.filename || file.originalname,
                        text: 'Достижение',
                        fileName: file.originalname,
                        fileSize: file.size,
                        mimeType: file.mimetype
                    });
                }
            });
        }

        achievementsData = achievementsData.map((achievement, index) => ({
            title: achievement.title || `Достижение ${index + 1}`,
            file: achievement.file || 'default_file'
        }));

        updateData.achievements = achievementsData;

        if (data.contacts) {
            updateData.contacts = { ...user.contacts, ...data.contacts };
        }

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

export default {
    getUsers,
    getUsersCount,
    getUser,
    deleteUser,
    getUserProfile,
    updateUserProfile
};