import * as bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10; // 솔트 라운드 (보안 강도)
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}


async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
}

export { hashPassword, comparePassword }