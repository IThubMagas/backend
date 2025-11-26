import User from "../models/User.model.js";

export async function getUsers(req, res) {
    try {
        const userRoles = req.user.roles;
        const { industry, workFormat, employmentType, status } = req.query
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100);
        const skip = (page - 1) * limit;
        const filter = {
            isPublic: true
        }
        if (userRoles.includes("admin")) {
            if (req.query.role) {
                filter.roles = req.query.role;
            }
        } else {
            filter.roles = "student";
        }

        if (industry) {
            const industies = industry.split(',').map(ind => ind.trim())
            filter.industry = { $in: industies }
        }
        if (workFormat) {
            filter.workFormat = workFormat
        }
        if (employmentType) {
            filter.employmentType = employmentType
        }
        if (status) {
            filter.status = status
        }

        const [users, total] = await Promise.all([
            User.find(filter).skip(skip).limit(limit).populate('user', 'firstName lastName patronymic avatar phoneNumber'),
            User.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit)
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

export async function getUserProfile(req, res) {
    try {
        const { id } = req.user;

        const usersProfile = await User.findById(id);
        if (!usersProfile) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }
        return res.status(200).json({
            students: usersProfile,
        });
    } catch (error) {
        return res.status(500).json("Не удалось найти");
    }
}


export async function getUsersCount(req, res) {
    try {
        const { status } = req.query
        const filter = {
            isPublic: true
        }

        if (status) {
            filter.status = status
        } else {
            return res.status(400).json({ message: "Статус обязателен для подсчета пользователей" })
        }

        const usersCount = await User.countDocuments(filter)
        res.status(200).json(usersCount)
    } catch (error) {
        res.status(500).json({ message: "Ошибка при подсчете пользователей" });
        console.error(error);
    }
}

export async function getUser(req, res) {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId)
            .populate("user", "avatar firstName lastName age phoneNumber email");

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден не найдено" });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Не удалось получить пользователя" });
        console.error(error);
    }
}


export async function updateUser(req, res) {
    try {
        const { id } = req.user;
        const { userId } = req.params;
        const data = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "Резюме не найдено" });
        }

        if (id !== user.user.toString()) {
            console.log(id, user.user);

            return res.status(403).json({ message: "У вас нет доступа" });
        }

        await User.findByIdAndUpdate(
            userId,
            { $set: data }
        );

        await User.findByIdAndUpdate(
            data.user._id,
            { $set: data.user }
        )

        res.status(200).json({ message: "Пользователь был успешно обновлён" });
    } catch (error) {
        res.status(500).json({ message: "Не удалось обновить пользователя" });
        console.error(error);
    }
}

export async function deleteUser(req, res) {
    try {
        const { id } = req.user;
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        if (id !== user.user.toString()) {
            return res.status(403).json({ message: "У вас нет доступа" });
        }

        await user.deleteOne();

        res.status(200).json({ message: "Пользователь успешно удалён" });
    } catch (error) {
        res.status(500).json({ message: "Не удалось удалить пользователя" });
        console.error(error);
    }
}