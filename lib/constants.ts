export const APP_NAME = "道具運搬担当レコード";
export const SESSION_TTL_DAYS = 14;

export const itemTypeLabels = {
  BOAT: "ボート",
  ENGINE: "エンジン"
} as const;

export const roleTypeLabels = {
  STORAGE: "保管",
  GO: "行き",
  RETURN: "帰り"
} as const;

export const roleOptions = ["STORAGE", "GO", "RETURN"] as const;
export const itemOptions = ["BOAT", "ENGINE"] as const;

export const feeRates = {
  boatStorage: 50,
  boatGo: 300,
  boatReturn: 300,
  engineStorage: 50,
  engineGo: 200,
  engineReturn: 200
} as const;
