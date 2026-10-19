/** 실데이터 모드에 필요한 설정이 없음을 나타낸다. 라우트에서 HTTP 500 + 안내 문구로 매핑한다. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** 환경변수 값을 반환하고, 비어 있으면 변수 이름만 담은 ConfigError를 던진다. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}
