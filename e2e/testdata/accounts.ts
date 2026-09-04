export interface TestAccount {
  phone: string;
  password: string;
}

export function getTestAccount(role = 'default'): TestAccount {
  const suffix = role === 'default' ? '' : `_${role.toUpperCase()}`;
  const phone = process.env[`MIABI_TEST_PHONE${suffix}`];
  const password = process.env[`MIABI_TEST_PASSWORD${suffix}`];
  if (!phone || !password) {
    throw new Error(
      `MIABI_TEST_PHONE${suffix} / MIABI_TEST_PASSWORD${suffix} 未设置。参考 .env.example 配置一个可用的测试账号。`,
    );
  }
  return { phone, password };
}

// 可供并发工作进程使用的账号数量。默认值为 1（单账号，与原有的串行行为一致）。
// 将 MIABI_TEST_ACCOUNT_POOL_SIZE 设为 N，并提供后缀为 _1 至 _N 的账号，
// 即可启用 N 个并发工作进程。
export function getTestAccountPoolSize(): number {
  const raw = process.env.MIABI_TEST_ACCOUNT_POOL_SIZE;
  const size = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(size) && size > 0 ? size : 1;
}

// 将工作进程的 parallelIndex 映射到账号池中稳定的账号槽位。
export function getTestAccountForSlot(slot: number): TestAccount {
  const poolSize = getTestAccountPoolSize();
  if (poolSize <= 1) return getTestAccount();
  return getTestAccount(String((slot % poolSize) + 1));
}
