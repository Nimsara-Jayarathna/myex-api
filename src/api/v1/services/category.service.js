import Category from "../../../models/Category.js";

const ALLOWED_TYPES = ["income", "expense"];

export const buildCategoryResponse = (category) => ({
    id: category._id,
    name: category.name,
    type: category.type,
    isDefault: category.isDefault,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    isGlobal: !category.user,
});

const normalizeName = (name = "") => name.trim();

const getLimitForUser = (user) => user?.categoryLimit ?? 10;

export const listActiveCategories = async (user, type) => {
    if (type && !ALLOWED_TYPES.includes(type)) {
        const error = new Error("type must be either income or expense");
        error.status = 400;
        throw error;
    }

    const filter = {
        isActive: true,
        $or: [{ user: user._id }, { user: null }],
    };

    if (type) {
        filter.type = type;
    }

    const categories = await Category.find(filter).sort({
        type: 1,
        isDefault: -1,
        name: 1,
    });

    return {
        categories: categories.map(buildCategoryResponse),
        limit: getLimitForUser(user),
    };
};

export const listAllCategories = async (user, type) => {
    if (type && !ALLOWED_TYPES.includes(type)) {
        const error = new Error("type must be either income or expense");
        error.status = 400;
        throw error;
    }

    const filter = {
        $or: [{ user: user._id }, { user: null }],
    };

    if (type) {
        filter.type = type;
    }

    const categories = await Category.find(filter).sort({
        type: 1,
        isDefault: -1,
        isActive: -1,
        name: 1,
    });

    return {
        categories: categories.map(buildCategoryResponse),
        limit: getLimitForUser(user),
    };
};

export const createCategory = async (user, { name, type }) => {
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
        const error = new Error("name is required");
        error.status = 400;
        throw error;
    }

    if (!type || !ALLOWED_TYPES.includes(type)) {
        const error = new Error("type must be either income or expense");
        error.status = 400;
        throw error;
    }

    const existing = await Category.findOne({
        user: user._id,
        type,
        name: normalizedName,
    });

    const limit = getLimitForUser(user);

    if (existing) {
        if (existing.isActive) {
            const error = new Error("Category already exists");
            error.status = 409;
            throw error;
        }

        const activeCount = await Category.countDocuments({
            type,
            isActive: true,
            $or: [{ user: user._id }, { user: null }],
        });

        if (activeCount >= limit) {
            const error = new Error(`Category limit of ${limit} reached`);
            error.status = 400;
            throw error;
        }

        existing.isActive = true;
        await existing.save();

        return { category: buildCategoryResponse(existing), reactivated: true };
    }

    const activeCount = await Category.countDocuments({
        type,
        isActive: true,
        $or: [{ user: user._id }, { user: null }],
    });

    if (activeCount >= limit) {
        const error = new Error(`Category limit of ${limit} reached`);
        error.status = 400;
        throw error;
    }

    const category = await Category.create({
        user: user._id,
        type,
        name: normalizedName,
    });

    return { category: buildCategoryResponse(category) };
};

export const setDefaultCategory = async (user, categoryId, { isDefault }) => {
    if (isDefault !== true) {
        const error = new Error("isDefault must be true to set the default category");
        error.status = 400;
        throw error;
    }

    const category = await Category.findOne({
        _id: categoryId,
        user: user._id,
    });

    if (!category) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
    }

    if (!category.isActive) {
        const error = new Error("Category is inactive");
        error.status = 400;
        throw error;
    }

    const currentDefaultName =
        category.type === "income"
            ? user.defaultIncomeCategories?.[0]
            : user.defaultExpenseCategories?.[0];

    const alreadyDefaultAndAligned = category.isDefault && currentDefaultName === category.name;

    if (!alreadyDefaultAndAligned) {
        await Category.updateMany(
            { user: user._id, type: category.type, isDefault: true, _id: { $ne: categoryId } },
            { $set: { isDefault: false } }
        );

        if (!category.isDefault) {
            category.isDefault = true;
            await category.save();
        }
    }

    if (category.type === "income") {
        user.defaultIncomeCategories = [category.name];
    } else {
        user.defaultExpenseCategories = [category.name];
    }
    await user.save();

    return {
        category: buildCategoryResponse(category),
        defaults: {
            defaultIncomeCategories: user.defaultIncomeCategories,
            defaultExpenseCategories: user.defaultExpenseCategories,
        },
        unchanged: alreadyDefaultAndAligned,
    };
};

export const archiveCategory = async (user, categoryId) => {
    const category = await Category.findOne({
        _id: categoryId,
        user: user._id,
    });

    if (!category) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
    }

    if (category.isDefault) {
        const error = new Error("Default categories cannot be removed");
        error.status = 400;
        throw error;
    }

    if (!category.isActive) {
        return { category: buildCategoryResponse(category), archived: true };
    }

    category.isActive = false;
    await category.save();

    return { category: buildCategoryResponse(category), archived: true };
};
