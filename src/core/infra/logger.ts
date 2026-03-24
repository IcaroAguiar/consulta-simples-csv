export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

export const consoleLogger: Logger = {
  info(message: string) {
    console.info(message);
  },
  error(message: string) {
    console.error(message);
  },
};
