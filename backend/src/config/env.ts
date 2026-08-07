import "dotenv/config";

const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not defined.`);
  }
  return value;
};

export const env = {
  PORT: Number(process.env.PORT ?? 3333),
  JWT_SECRET: getEnv("JWT_SECRET"),
  FRONTEND_URL: getEnv("FRONTEND_URL"),
  DATABASE_URL: getEnv("DATABASE_URL"),
  
}