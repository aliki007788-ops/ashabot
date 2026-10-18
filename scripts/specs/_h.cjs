/* کمک‌تابع‌های نوشتن تعریف فرایند: S(id, ربات, عنوان, کار، نمونه‌ی خروجی، بعد از آن، [مرحله‌های بعدی], {act, pick, human}) */
const S = (id, bot, title, does, sample, after, next = [], opts = {}) => ({ id, bot, title, does, sample, after, next, ...opts });
const W = (slug, title, tagline, prompts, process) => ({ slug, title, tagline, prompts, process });
const P = (id, title, summary, trigger, outcome, stages) => ({ id, title, summary, trigger, outcome, stages });
const T = (icon, label, inputLabel, scenarios) => ({ icon, label, inputLabel, scenarios });
module.exports = { S, W, P, T };
