import User from "../models/User.model.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from "bcrypt";

async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
        console.log('Файл удален:', filePath);
        return true;
    } catch (err) {
        // Если файла не существует, это нормально
        if (err.code === 'ENOENT') {
            console.log('Файл не найден, возможно уже удален:', filePath);
        } else {
            console.warn('Ошибка при удалении файла:', err.message);
        }
        return false;
    }
}

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

        console.log('req.files:', req.files);
        console.log('req.body.avatar:', data.avatar);
        console.log('Тип req.body.avatar:', typeof data.avatar);

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

        if (data.avatar !== undefined) {
            const shouldDeleteAvatar = 
                data.avatar === 'DELETE_AVATAR' || 
                data.avatar === 'null' ||
                data.avatar === '' || 
                data.avatar === 'undefined' ||
                data.avatar === null;
            
            if (shouldDeleteAvatar) {
                if (user.avatar) {
                    const avatarPath = path.join('uploads/avatars', user.avatar);
                    await deleteFile(avatarPath);
                }
                
                updateData.avatar = null;
                console.log('Аватар удален из профиля');
            }
            else if (typeof data.avatar === 'string' && data.avatar !== 'undefined') {
                if (!data.avatar.startsWith('data:') && !data.avatar.includes('base64')) {
                    updateData.avatar = data.avatar;
                    console.log('Аватар сохранен (имя файла):', data.avatar);
                }
            }
        }

        if (req.files?.avatar && req.files.avatar[0]) {
            const avatarFile = req.files.avatar[0];

            if (user.avatar) {
                const oldAvatarPath = path.join('uploads/avatars', user.avatar);
                await deleteFile(oldAvatarPath);
            }
            
            updateData.avatar = avatarFile.filename || avatarFile.originalname;
            console.log('Новый аватар сохранен:', updateData.avatar);
        }

        let achievementsData = [];

        if (data.achievements && Array.isArray(data.achievements)) {
            achievementsData = data.achievements;
        }

        if (req.files?.achievementFiles && req.files.achievementFiles.length > 0) {
            const achievementFiles = req.files.achievementFiles;
            
            achievementFiles.forEach((file) => {
                const filename = file.filename || file.originalname;

                let fileAssigned = false;
                
                for (let i = 0; i < achievementsData.length; i++) {
                    if (!achievementsData[i].file || 
                        achievementsData[i].file === 'undefined' || 
                        achievementsData[i].file === 'null' ||
                        achievementsData[i].file === '') {
                        achievementsData[i].file = filename;
                        fileAssigned = true;
                        console.log(`Файл ${filename} привязан к достижению ${i}: ${achievementsData[i].text}`);
                        break;
                    }
                }

                if (!fileAssigned) {
                    achievementsData.push({
                        text: `Достижение ${achievementsData.length + 1}`,
                        file: filename
                    });
                    console.log(`Создано новое достижение с файлом ${filename}`);
                }
            });
        }

        achievementsData = achievementsData
            .filter(achievement => {
                if (!achievement.text || achievement.text.trim() === '') {
                    return false;
                }
                return true;
            })
            .map(achievement => ({
                text: achievement.text || 'Достижение',
                file: (achievement.file && 
                       achievement.file !== 'undefined' && 
                       achievement.file !== 'null' &&
                       achievement.file !== '') ? achievement.file : null
            }));

        console.log('Итоговые достижения:', achievementsData);
        updateData.achievements = achievementsData;

        if (data.contacts) {
            updateData.contacts = { ...user.contacts, ...data.contacts };
        }

        if (data.newPassword) {
            if (!data.currentPassword) {
              return res.status(400).json(
                { message: 'Текущий пароль обязателен для смены пароля' },
              );
            }
      
            // Проверяем текущий пароль
            const isCurrentPasswordValid = await bcrypt.compare(
              data.currentPassword, 
              user.password
            );
      
            if (!isCurrentPasswordValid) {
              return res.status(400).json(
                { message: 'Текущий пароль неверен' },
              );
            }
      
            // Хешируем новый пароль
            updateData.password = await bcrypt.hash(data.newPassword, 10);
          }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-emailVerificationCode -emailVerificationCodeExpires -passwordResetCode -passwordResetCodeExpires');

        res.status(200).json({
            message: "Профиль успешно обновлён",
            user: updatedUser
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            console.error('Ошибка валидации:', error.errors);
            return res.status(400).json({ 
                message: "Ошибка валидации данных", 
                error: error.message,
                details: error.errors 
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: "Пользователь с таким email или номером телефона уже существует" });
        }
        console.error('Ошибка при обновлении профиля:', error);
        res.status(500).json({ message: "Не удалось обновить профиль" });
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