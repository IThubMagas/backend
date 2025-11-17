import Resume from "../models/Resume.model.js";

export async function getResumes(req, res){
    try {
        const { industry, workFormat, employmentType, status } = req.query
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100);
        const skip = (page - 1) * limit;
        const filter = {
            isPublic: true
        }

        if(industry) {
            filter.industry = industry
        }
        if(workFormat) {
            filter.workFormat = workFormat
        }
        if(employmentType) {
            filter.employmentType = employmentType
        }
        if(status) {
            filter.status = status
        }

        const [ resumes, total ] = await Promise.all([
            Resume.find(filter).skip(skip).limit(limit).populate('user', 'firstName lastName patronymic avatar phoneNumber'),
            Resume.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit)
        res.status(200).json({ 
            resumes,
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
        res.status(500).json({ message: "Не удалось получить список резюме" });
        console.error(error);
    }
}

export async function getResumesCount(req, res) {
    try {
        const { industry, workFormat, employmentType, status } = req.query
        const filter = {
            isPublic: true
        }

        if(industry) {
            filter.industry = industry
        }
        if(workFormat) {
            filter.workFormat = workFormat
        }
        if(employmentType) {
            filter.employmentType = employmentType
        }
        if(status) {
            filter.status = status
        }

        const resumesCount = await Resume.countDocuments(filter)
        res.status(200).json(resumesCount)
    } catch (error) {
        res.status(500).json({ message: "Ошибка при подсчете резюме" });
        console.error(error);
    }
}

export async function getResume(req, res){
    try {
        const { resumeId } = req.params;
        const resume = await Resume.findById(resumeId)
            .populate("user", "avatar firstName lastName age");

        if(!resume){
            return res.status(404).json({ message: "Резюме не найдено" });
        }

        res.status(200).json({ resume });
    } catch (error) {
        res.status(500).json({ message: "Не удалось получить резюме" });
        console.error(error);
    }
}

export async function createResume(req, res){
    try {
        const { id } = req.user;
        const{
            title,
            description,
            contacts,
            workExperience,
            education,
            skills,
            languages
        } = req.body;

        await Resume.create({
            user: id,
            title,
            description,
            contacts,
            workExperience,
            education,
            skills,
            languages
        });
        
        res.status(200).json({ message: "Резюме успешно добавлено" });
    } catch (error) {
        res.status(500).json({ message: "Не удалось создать резюме" });
        console.error(error);
    }
}

export async function updateResume(req, res){
    try {
        const { id } = req.user;
        const { resumeId } = req.params;
        const data = req.body;

        const resume = await Resume.findById(resumeId);

        if(!resume){
            return res.status(404).json({ message: "Резюме не найдено" });
        }

        if(id !== resume.user.toString()){
            console.log(id, resume.user);
            
            return res.status(403).json({ message: "У вас нет доступа" });
        }

        await Resume.findByIdAndUpdate(
            resumeId,
            { $set: data }
        );

        res.status(200).json({ message: "Резюме успешно обновлено" });
    } catch (error) {
        res.status(500).json({ message: "Не удалось обновить резюме" });
        console.error(error);
    }
}

export async function deleteResume(req, res){
    try {
        const { id } = req.user;
        const { resumeId } = req.params;
        const resume = await Resume.findById(resumeId);

        if(!resume){
            return res.status(404).json({ message: "Резюме не найдено" });
        }

        if(id !== resume.user.toString()){
            return res.status(403).json({ message: "У вас нет доступа" });
        }

        await resume.deleteOne();

        res.status(200).json({ message: "Резюме успешно удалено" });
    } catch (error) {
        res.status(500).json({ message: "Не удалось удалить резюме" });
        console.error(error);
    }
}