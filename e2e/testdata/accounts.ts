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

// Number of accounts available for concurrent workers. Defaults to 1 (single
// account, matches historical serial behavior). Set MIABI_TEST_ACCOUNT_POOL_SIZE
// to N and provide accounts _1.._N to enable N concurrent workers.
export function getTestAccountPoolSize(): number {
  const raw = process.env.MIABI_TEST_ACCOUNT_POOL_SIZE;
  const size = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(size) && size > 0 ? size : 1;
}

// Maps a worker's parallelIndex to a stable account slot in the pool.
export function getTestAccountForSlot(slot: number): TestAccount {
  const poolSize = getTestAccountPoolSize();
  if (poolSize <= 1) return getTestAccount();
  return getTestAccount(String((slot % poolSize) + 1));
}
