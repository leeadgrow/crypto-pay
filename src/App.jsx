import { useEffect, useMemo, useRef, useState } from "react";
import {
  HDNodeWallet,
  Interface,
  JsonRpcProvider,
  Mnemonic,
  Wallet,
  formatUnits,
  isAddress,
  parseUnits,
  randomBytes,
} from "ethers";

const STORAGE_KEY = "cryptrail.wallet.v1";
const CONTACTS_KEY = "cryptrail.contacts.v1";
const ACTIVITY_KEY = "cryptrail.activity.v1";
const TRACKED_TOKENS_KEY = "cryptrail.tracked.tokens.v1";
const BIOMETRIC_KEY = "cryptrail.biometric.v1";
const BALANCE_SNAPSHOTS_KEY = "cryptrail.balance.snapshots.v1";
const PASSCODE_RULE = /^\d{6}$/;
const ERC20_TRANSFER_INTERFACE = new Interface(["function transfer(address to, uint256 value) returns (bool)"]);
const TOKEN_ICON_SYMBOL_MAP = {
  POL: "matic",
};
const TOKEN_ICON_BASE_URL = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color";
const DEFAULT_PRICES = {
  ETH: 3000,
  POL: 0.8,
  BNB: 500,
  AVAX: 30,
  SOL: 120,
  TRX: 0.12,
  USDC: 1,
  USDT: 1,
};

const TOKEN_CATALOG = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", decimals: 8, contracts: {} },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", decimals: 18, contracts: {} },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    decimals: 6,
    contracts: {
      ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      base: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      bsc: "0x55d398326f99059fF775485246999027B3197955",
      arbitrum: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      optimism: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      avalanche: "0x9702230A8Ea53601f5cD2dC00fDBc13d4Df4A8c7",
    },
  },
  { id: "ripple", symbol: "XRP", name: "XRP", decimals: 6, contracts: {} },
  { id: "binancecoin", symbol: "BNB", name: "BNB", decimals: 18, contracts: {} },
  { id: "solana", symbol: "SOL", name: "Solana", decimals: 9, contracts: {} },
  {
    id: "usd-coin",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    contracts: {
      ethereum: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      bsc: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      optimism: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
      avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    },
  },
  { id: "cardano", symbol: "ADA", name: "Cardano", decimals: 6, contracts: {} },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", decimals: 8, contracts: {} },
  { id: "tron", symbol: "TRX", name: "Tron", decimals: 6, contracts: {} },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    decimals: 18,
    contracts: {
      ethereum: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      polygon: "0x53E0bca35eC356BD5ddDFebBD1Fc0fD03FaBad39",
      bsc: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
      arbitrum: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      optimism: "0x350a791BFC2C21F9Ed5d10980Dad2e2638ffa7f6",
      avalanche: "0x5947BB275c521040051D82396192181b413227A3",
    },
  },
  {
    id: "wrapped-bitcoin",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    contracts: {
      ethereum: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      polygon: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      bsc: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      arbitrum: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      optimism: "0x68f180fcce6836688e9084f035309e29bf0a2095",
      avalanche: "0x50b7545627a5162F82A992c33b87aDc75187B218",
    },
  },
  { id: "stellar", symbol: "XLM", name: "Stellar", decimals: 7, contracts: {} },
  { id: "sui", symbol: "SUI", name: "Sui", decimals: 9, contracts: {} },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", decimals: 18, contracts: {} },
  {
    id: "shiba-inu",
    symbol: "SHIB",
    name: "Shiba Inu",
    decimals: 18,
    contracts: {
      ethereum: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    },
  },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", decimals: 8, contracts: {} },
  { id: "toncoin", symbol: "TON", name: "Toncoin", decimals: 9, contracts: {} },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", decimals: 10, contracts: {} },
  {
    id: "uniswap",
    symbol: "UNI",
    name: "Uniswap",
    decimals: 18,
    contracts: {
      ethereum: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
  },
  {
    id: "dai",
    symbol: "DAI",
    name: "Dai",
    decimals: 18,
    contracts: {
      ethereum: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      polygon: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      bsc: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
      arbitrum: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      optimism: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      avalanche: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    },
  },
  { id: "aptos", symbol: "APT", name: "Aptos", decimals: 8, contracts: {} },
  { id: "near", symbol: "NEAR", name: "Near", decimals: 24, contracts: {} },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer", decimals: 8, contracts: {} },
  {
    id: "pepe",
    symbol: "PEPE",
    name: "Pepe",
    decimals: 18,
    contracts: {
      ethereum: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    },
  },
];

const DEFAULT_TRACKED_TOKEN_IDS = ["usd-coin", "tether", "wrapped-bitcoin", "chainlink", "dai", "uniswap"];

const NETWORKS = [
  {
    id: "polygon",
    name: "Polygon",
    symbol: "POL",
    chainId: 137,
    enabled: true,
    explorerTxBaseUrl: "https://polygonscan.com/tx/",
    rpcUrls: ["https://polygon-rpc.com", "https://polygon-bor-rpc.publicnode.com"],
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    chainId: 1,
    enabled: true,
    explorerTxBaseUrl: "https://etherscan.io/tx/",
    rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com"],
  },
  {
    id: "base",
    name: "Base",
    symbol: "ETH",
    chainId: 8453,
    enabled: true,
    explorerTxBaseUrl: "https://basescan.org/tx/",
    rpcUrls: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
  },
  {
    id: "bsc",
    name: "BNB Chain",
    symbol: "BNB",
    chainId: 56,
    enabled: true,
    explorerTxBaseUrl: "https://bscscan.com/tx/",
    rpcUrls: ["https://bsc-dataseed.binance.org", "https://bsc-rpc.publicnode.com"],
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ETH",
    chainId: 42161,
    enabled: true,
    explorerTxBaseUrl: "https://arbiscan.io/tx/",
    rpcUrls: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"],
  },
  {
    id: "optimism",
    name: "Optimism",
    symbol: "ETH",
    chainId: 10,
    enabled: true,
    explorerTxBaseUrl: "https://optimistic.etherscan.io/tx/",
    rpcUrls: ["https://mainnet.optimism.io", "https://optimism-rpc.publicnode.com"],
  },
  {
    id: "avalanche",
    name: "Avalanche",
    symbol: "AVAX",
    chainId: 43114,
    enabled: true,
    explorerTxBaseUrl: "https://snowtrace.io/tx/",
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain-rpc.publicnode.com"],
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    chainId: null,
    enabled: false,
    explorerTxBaseUrl: "https://solscan.io/tx/",
    rpcUrls: [],
  },
  {
    id: "tron",
    name: "Tron",
    symbol: "TRX",
    chainId: null,
    enabled: false,
    explorerTxBaseUrl: "https://tronscan.org/#/transaction/",
    rpcUrls: [],
  },
];

const ACTIVE_NETWORKS = NETWORKS.filter((network) => network.enabled);
const DEFAULT_NETWORK_ID = ACTIVE_NETWORKS[0]?.id || "ethereum";
const PLACEHOLDER_NETWORKS = NETWORKS.filter((network) => !network.enabled);
const EVM_NETWORK_HINT = PLACEHOLDER_NETWORKS.length
  ? `Live on ${ACTIVE_NETWORKS.length} EVM chains. ${PLACEHOLDER_NETWORKS.map((network) => network.name).join(
      " and "
    )} are coming soon.`
  : `Live on ${ACTIVE_NETWORKS.length} EVM chains.`;

const LEGACY_NETWORK_MAP = {
  matic: "polygon",
};

function resolveSavedNetwork(networkId) {
  const mappedId = LEGACY_NETWORK_MAP[networkId] || networkId;
  const exists = ACTIVE_NETWORKS.some((network) => network.id === mappedId);
  return exists ? mappedId : DEFAULT_NETWORK_ID;
}

function normalizePhrase(phrase) {
  return phrase.trim().toLowerCase().split(/\s+/).join(" ");
}

function randomWordIndexes(wordCount, amount = 3) {
  const picks = new Set();
  while (picks.size < amount) {
    picks.add(Math.floor(Math.random() * wordCount));
  }
  return [...picks].sort((a, b) => a - b);
}

function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function encodeBalanceOf(address) {
  const payload = address.toLowerCase().replace("0x", "").padStart(64, "0");
  return `0x70a08231${payload}`;
}

async function rpcRequest(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC ${response.status}`);
  }

  const body = await response.json();
  if (body.error) {
    throw new Error(body.error.message || "RPC error");
  }
  return body.result;
}

async function rpcWithFallback(urls, method, params) {
  let lastError = new Error("RPC unavailable");
  for (const url of urls) {
    try {
      return await rpcRequest(url, method, params);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function fetchWalletBalances(network, address, tokens) {
  const nativeHex = await rpcWithFallback(network.rpcUrls, "eth_getBalance", [address, "latest"]);
  const nativeAmount = formatUnits(BigInt(nativeHex), 18);

  const tokenBalances = await Promise.all(
    tokens.map(async (token) => {
      const tokenHex = await rpcWithFallback(network.rpcUrls, "eth_call", [
        {
          to: token.contract,
          data: encodeBalanceOf(address),
        },
        "latest",
      ]);

      const amount = formatUnits(BigInt(tokenHex), token.decimals);
      return {
        ...token,
        amount,
      };
    })
  );

  return {
    nativeAmount,
    tokenBalances,
  };
}

async function getWorkingProvider(network) {
  let lastError = new Error("No available RPC provider");
  for (const rpcUrl of network.rpcUrls) {
    try {
      const provider = new JsonRpcProvider(rpcUrl, network.chainId);
      await provider.getBlockNumber();
      return provider;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function formatAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0.00";
  if (parsed === 0) return "0.00";
  if (parsed < 0.0001) return "<0.0001";
  if (parsed < 1) return parsed.toFixed(4);
  if (parsed < 1000) return parsed.toFixed(2);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatUsd(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "$0.00";
  if (parsed < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: parsed >= 1000 ? 0 : 2,
  }).format(parsed);
}

function formatSignedUsd(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return "$0.00";
  const prefix = parsed > 0 ? "+" : "-";
  return `${prefix}${formatUsd(Math.abs(parsed))}`;
}

function formatUsdRate(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "$0.00";
  if (parsed < 0.00001) return "<$0.00001";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: parsed >= 1 ? 2 : 3,
    maximumFractionDigits: 5,
  }).format(parsed);
}

function formatPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0.00%";
  const sign = parsed > 0 ? "+" : "";
  return `${sign}${parsed.toFixed(2)}%`;
}

function saveVault(vault) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

function loadVault() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function clearVault() {
  localStorage.removeItem(STORAGE_KEY);
}

function randomBytesArray(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toBase64Url(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${pad}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function loadBiometricPreference() {
  try {
    const raw = localStorage.getItem(BIOMETRIC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.enabled || !parsed?.credentialId) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function saveBiometricPreference(value) {
  localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(value));
}

function clearBiometricPreference() {
  localStorage.removeItem(BIOMETRIC_KEY);
}

function loadBalanceSnapshots() {
  try {
    const raw = localStorage.getItem(BALANCE_SNAPSHOTS_KEY);
    if (!raw) return { address: "", networks: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { address: "", networks: {} };
    return {
      address: typeof parsed.address === "string" ? parsed.address : "",
      networks: parsed.networks && typeof parsed.networks === "object" ? parsed.networks : {},
    };
  } catch (error) {
    return { address: "", networks: {} };
  }
}

function saveBalanceSnapshots(value) {
  localStorage.setItem(BALANCE_SNAPSHOTS_KEY, JSON.stringify(value));
}

function clearBalanceSnapshots() {
  localStorage.removeItem(BALANCE_SNAPSHOTS_KEY);
}

function loadStoredList(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveStoredList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadTrackedTokenIds() {
  const saved = loadStoredList(TRACKED_TOKENS_KEY);
  const catalogIds = new Set(TOKEN_CATALOG.map((token) => token.id));
  const validSaved = saved.filter((id) => catalogIds.has(id));
  if (validSaved.length > 0) {
    return validSaved;
  }
  return DEFAULT_TRACKED_TOKEN_IDS;
}

function isPhraseMode(mode) {
  return mode === "create" || mode === "import-phrase";
}

export default function App() {
  const [view, setView] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [vault, setVault] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [unlockPasscode, setUnlockPasscode] = useState("");
  const [walletTab, setWalletTab] = useState("home");

  const [setupMode, setSetupMode] = useState("create");
  const [wordCount, setWordCount] = useState(12);
  const [generatedPhrase, setGeneratedPhrase] = useState("");
  const [importPhrase, setImportPhrase] = useState("");
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [draftWallet, setDraftWallet] = useState(null);

  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [securityPasscode, setSecurityPasscode] = useState("");
  const [securityWords, setSecurityWords] = useState({});
  const [securityPrivateKey, setSecurityPrivateKey] = useState("");
  const [verifyIndexes, setVerifyIndexes] = useState([]);

  const [networkId, setNetworkId] = useState(DEFAULT_NETWORK_ID);
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);
  const [balances, setBalances] = useState({
    loading: false,
    error: "",
    nativeAmount: "0",
    tokenBalances: [],
  });
  const [sendToAddress, setSendToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendAssetKey, setSendAssetKey] = useState("usdc");
  const [sendState, setSendState] = useState({
    loading: false,
    hash: "",
    status: "",
  });
  const [contacts, setContacts] = useState(() => loadStoredList(CONTACTS_KEY));
  const [contactName, setContactName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [activity, setActivity] = useState(() => loadStoredList(ACTIVITY_KEY));
  const [activityFilter, setActivityFilter] = useState("all");
  const [biometricPreference, setBiometricPreference] = useState(() => loadBiometricPreference());
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestAssetKey, setRequestAssetKey] = useState("usdc");
  const [trackedTokenIds, setTrackedTokenIds] = useState(() => loadTrackedTokenIds());
  const [gasGwei, setGasGwei] = useState("");
  const [gasBusy, setGasBusy] = useState(false);
  const [brandSignal, setBrandSignal] = useState("idle");
  const brandSignalTimeoutRef = useRef(null);
  const [priceState, setPriceState] = useState({
    loading: false,
    error: "",
    bySymbol: DEFAULT_PRICES,
    changeBySymbol: {},
    updatedAt: null,
    source: "fallback",
  });
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [feePreview, setFeePreview] = useState({
    loading: false,
    error: "",
    gasLimit: "",
    gasPriceGwei: "",
    networkFeeNative: "",
    networkFeeUsd: "",
    sendValueUsd: "",
    totalDebitText: "",
  });
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const pullStartYRef = useRef(null);
  const walletScrollRef = useRef(null);
  const networkMenuRef = useRef(null);
  const balanceSnapshotsRef = useRef(loadBalanceSnapshots());
  const PULL_TRIGGER = 72;
  const PULL_MAX = 110;

  const activeNetwork = useMemo(
    () => ACTIVE_NETWORKS.find((network) => network.id === networkId) || ACTIVE_NETWORKS[0],
    [networkId]
  );
  const activeAddress = wallet?.address || vault?.address || "";
  const biometricEnabled = Boolean(biometricPreference?.enabled && biometricPreference?.credentialId);
  const trackedTokens = useMemo(
    () => TOKEN_CATALOG.filter((token) => trackedTokenIds.includes(token.id)),
    [trackedTokenIds]
  );
  const activeTrackedTokens = useMemo(
    () =>
      trackedTokens
        .filter((token) => Boolean(token.contracts?.[activeNetwork.id]))
        .map((token) => ({
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          contract: token.contracts[activeNetwork.id],
        })),
    [trackedTokens, activeNetwork.id]
  );
  const sendAssets = useMemo(
    () => [
      {
        key: "native",
        symbol: activeNetwork.symbol,
        decimals: 18,
        type: "native",
      },
      ...activeTrackedTokens.map((token) => ({
        key: token.symbol.toLowerCase(),
        symbol: token.symbol,
        decimals: token.decimals,
        type: "token",
        contract: token.contract,
      })),
    ],
    [activeNetwork, activeTrackedTokens]
  );
  const requestAsset = useMemo(
    () => sendAssets.find((asset) => asset.key === requestAssetKey) || sendAssets[0],
    [requestAssetKey, sendAssets]
  );
  const supportedAssetSymbols = useMemo(() => sendAssets.map((asset) => asset.symbol).join(", "), [sendAssets]);
  const supportedAssetSummary = useMemo(() => {
    const symbols = sendAssets.map((asset) => asset.symbol);
    if (symbols.length <= 6) return symbols.join(", ");
    return `${symbols.slice(0, 6).join(", ")} +${symbols.length - 6} more`;
  }, [sendAssets]);
  const usdBalance = useMemo(() => {
    const nativePrice = priceState.bySymbol[activeNetwork.symbol] || 0;
    const native = Number(balances.nativeAmount || 0);
    const tokenTotal = balances.tokenBalances.reduce((sum, token) => {
      const tokenNumber = Number(token.amount || 0);
      if (!Number.isFinite(tokenNumber)) return sum;
      const tokenPrice = priceState.bySymbol[token.symbol] || 0;
      return sum + tokenNumber * tokenPrice;
    }, 0);
    const nativeUsd = Number.isFinite(native) ? native * nativePrice : 0;
    return tokenTotal + nativeUsd;
  }, [activeNetwork.symbol, balances.nativeAmount, balances.tokenBalances, priceState.bySymbol]);
  const sendAsset = useMemo(
    () => sendAssets.find((asset) => asset.key === sendAssetKey) || sendAssets[0],
    [sendAssetKey, sendAssets]
  );

  useEffect(() => {
    const existingVault = loadVault();
    if (existingVault) {
      setVault(existingVault);
      setNetworkId(resolveSavedNetwork(existingVault.networkId));
      setView("unlock");
      return;
    }
    setView("welcome");
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (view === "wallet") return;
    pullStartYRef.current = null;
    setPullDistance(0);
    setPullRefreshing(false);
    setNetworkMenuOpen(false);
  }, [view]);

  useEffect(() => {
    if (!networkMenuOpen) return undefined;
    function handlePointerDown(event) {
      if (!networkMenuRef.current?.contains(event.target)) {
        setNetworkMenuOpen(false);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [networkMenuOpen]);

  useEffect(
    () => () => {
      if (brandSignalTimeoutRef.current) {
        clearTimeout(brandSignalTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const selectedAssetExists = sendAssets.some((asset) => asset.key === sendAssetKey);
    if (!selectedAssetExists) {
      setSendAssetKey(sendAssets[0]?.key || "native");
    }
  }, [sendAssets, sendAssetKey]);

  useEffect(() => {
    const selectedRequestAssetExists = sendAssets.some((asset) => asset.key === requestAssetKey);
    if (!selectedRequestAssetExists) {
      setRequestAssetKey(sendAssets[0]?.key || "native");
    }
  }, [sendAssets, requestAssetKey]);

  useEffect(() => {
    if (!vault) return;
    if (vault.networkId === networkId) return;
    const nextVault = { ...vault, networkId };
    setVault(nextVault);
    saveVault(nextVault);
  }, [vault, networkId]);

  useEffect(() => {
    setNetworkMenuOpen(false);
  }, [networkId]);

  useEffect(() => {
    if (!vault || !biometricEnabled) return;
    const linkedAddress = (biometricPreference?.address || "").toLowerCase();
    if (linkedAddress && linkedAddress !== vault.address.toLowerCase()) {
      clearBiometricPreference();
      setBiometricPreference(null);
    }
  }, [vault, biometricEnabled, biometricPreference]);

  useEffect(() => {
    const address = (vault?.address || wallet?.address || "").toLowerCase();
    if (!address) return;
    const current = balanceSnapshotsRef.current;
    if (current.address && current.address.toLowerCase() === address) {
      return;
    }
    const next = { address, networks: {} };
    balanceSnapshotsRef.current = next;
    saveBalanceSnapshots(next);
  }, [vault?.address, wallet?.address]);

  useEffect(() => {
    setSendState({ loading: false, hash: "", status: "" });
  }, [networkId]);

  useEffect(() => {
    saveStoredList(CONTACTS_KEY, contacts);
  }, [contacts]);

  useEffect(() => {
    saveStoredList(TRACKED_TOKENS_KEY, trackedTokenIds);
  }, [trackedTokenIds]);

  useEffect(() => {
    saveStoredList(ACTIVITY_KEY, activity);
  }, [activity]);

  useEffect(() => {
    if (!wallet || view !== "wallet") return;
    refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, networkId, view, activeTrackedTokens]);

  useEffect(() => {
    if (!wallet || view !== "wallet") return;
    refreshGasPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, networkId, view]);

  useEffect(() => {
    if (!wallet || view !== "wallet") return;
    refreshMarketPrices(true);
    const interval = setInterval(() => {
      refreshMarketPrices(false);
    }, 45000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, view]);

  useEffect(() => {
    if (!sendModalOpen) return;
    const timer = setTimeout(() => {
      estimateSendFees();
    }, 280);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendModalOpen, sendToAddress, sendAmount, sendAssetKey, networkId, priceState.bySymbol]);

  function resetOnboardingFields() {
    setWordCount(12);
    setGeneratedPhrase("");
    setImportPhrase("");
    setImportPrivateKey("");
    setBackupConfirmed(false);
    setDraftWallet(null);
    setPasscode("");
    setConfirmPasscode("");
    setSecurityPasscode("");
    setSecurityWords({});
    setSecurityPrivateKey("");
    setVerifyIndexes([]);
    setSetupMode("create");
  }

  function startCreateFlow() {
    setError("");
    resetOnboardingFields();
    setSetupMode("create");
    setView("create");
  }

  function startImportFlow() {
    setError("");
    resetOnboardingFields();
    setSetupMode("import-phrase");
    setView("import");
  }

  function generateNewWallet() {
    setError("");
    const entropySize = wordCount === 24 ? 32 : 16;
    const mnemonic = Mnemonic.fromEntropy(randomBytes(entropySize));
    const nextWallet = HDNodeWallet.fromMnemonic(mnemonic);
    setGeneratedPhrase(mnemonic.phrase);
    setDraftWallet(nextWallet);
    setBackupConfirmed(false);
  }

  function preparePasscodeStep(walletCandidate = draftWallet) {
    if (!walletCandidate) {
      setError("Generate or import a wallet first.");
      return;
    }
    if (setupMode === "create" && !backupConfirmed) {
      setError("Confirm that you saved your recovery phrase first.");
      return;
    }

    setError("");
    setPasscode("");
    setConfirmPasscode("");
    setSecurityPasscode("");
    setView("passcode");
  }

  function handleImportPhrase() {
    setError("");
    try {
      const normalized = normalizePhrase(importPhrase);
      const words = normalized.split(" ");
      if (words.length !== 12 && words.length !== 24) {
        setError("Seed phrase must contain exactly 12 or 24 words.");
        return;
      }
      const imported = Wallet.fromPhrase(normalized);
      setGeneratedPhrase(normalized);
      setDraftWallet(imported);
      setSetupMode("import-phrase");
      preparePasscodeStep(imported);
    } catch (importError) {
      setError("The seed phrase is invalid. Check spelling and word order.");
    }
  }

  function handleImportPrivateKey() {
    setError("");
    try {
      const normalized = importPrivateKey.trim().startsWith("0x")
        ? importPrivateKey.trim()
        : `0x${importPrivateKey.trim()}`;
      const imported = new Wallet(normalized);
      setDraftWallet(imported);
      setSetupMode("import-private");
      setGeneratedPhrase("");
      preparePasscodeStep(imported);
    } catch (importError) {
      setError("The private key is invalid.");
    }
  }

  function continueToSecurityCheck() {
    setError("");
    if (!PASSCODE_RULE.test(passcode)) {
      setError("Passcode must be exactly 6 digits.");
      return;
    }
    if (passcode !== confirmPasscode) {
      setError("Passcodes do not match.");
      return;
    }

    if (isPhraseMode(setupMode)) {
      const words = generatedPhrase.split(" ");
      setVerifyIndexes(randomWordIndexes(words.length));
    } else {
      setVerifyIndexes([]);
    }

    setSecurityPasscode("");
    setSecurityWords({});
    setSecurityPrivateKey("");
    setView("security-check");
  }

  async function finishSetup() {
    if (!draftWallet) {
      setError("Wallet setup data is missing. Start again.");
      return;
    }

    if (securityPasscode !== passcode) {
      setError("Security passcode check failed.");
      return;
    }

    if (isPhraseMode(setupMode)) {
      const phraseWords = generatedPhrase.split(" ");
      for (const index of verifyIndexes) {
        const givenWord = (securityWords[index] || "").trim().toLowerCase();
        const expectedWord = (phraseWords[index] || "").trim().toLowerCase();
        if (!givenWord || givenWord !== expectedWord) {
          setError(`Word #${index + 1} is incorrect.`);
          return;
        }
      }
    } else {
      const originalPrivateKey = draftWallet.privateKey.toLowerCase().replace("0x", "");
      const enteredPrivateKey = securityPrivateKey.toLowerCase().trim().replace("0x", "");
      if (!enteredPrivateKey || enteredPrivateKey !== originalPrivateKey) {
        setError("Private key security confirmation failed.");
        return;
      }
    }

    setBusy(true);
    setError("");
    try {
      const encryptedJson = await draftWallet.encrypt(passcode);
      const vaultData = {
        version: 1,
        address: draftWallet.address,
        encryptedJson,
        networkId,
        source: setupMode,
        createdAt: new Date().toISOString(),
      };

      clearBiometricPreference();
      setBiometricPreference(null);
      saveVault(vaultData);
      setVault(vaultData);
      setWallet(draftWallet);
      setView("wallet");
      setWalletTab("home");
      setNotice("Wallet is ready.");
      resetOnboardingFields();
    } catch (encryptError) {
      setError("Unable to secure the wallet locally.");
    } finally {
      setBusy(false);
    }
  }

  async function unlockWallet() {
    if (!vault) return;
    if (!PASSCODE_RULE.test(unlockPasscode)) {
      setError("Enter your 6-digit passcode.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const unlocked = await Wallet.fromEncryptedJson(vault.encryptedJson, unlockPasscode);
      setWallet(unlocked);
      setUnlockPasscode("");
      setView("wallet");
      setWalletTab("home");
      setNotice("Wallet unlocked.");
    } catch (unlockError) {
      setError("Unlock failed. Check your passcode.");
    } finally {
      setBusy(false);
    }
  }

  function lockWallet() {
    setWallet(null);
    setView("unlock");
    setWalletTab("home");
    setBalances((state) => ({ ...state, tokenBalances: [] }));
  }

  function resetLocalWallet() {
    clearVault();
    clearBiometricPreference();
    clearBalanceSnapshots();
    setVault(null);
    setWallet(null);
    setBiometricPreference(null);
    setUnlockPasscode("");
    setWalletTab("home");
    resetOnboardingFields();
    setView("welcome");
    setNotice("Local wallet data removed.");
  }

  async function refreshBalances() {
    if (!wallet) return;
    setBalances((previous) => ({
      ...previous,
      loading: true,
      error: "",
    }));

    try {
      const result = await fetchWalletBalances(activeNetwork, wallet.address, activeTrackedTokens);
      const nextSnapshot = {
        [activeNetwork.symbol]: Number(result.nativeAmount || 0),
      };
      result.tokenBalances.forEach((token) => {
        nextSnapshot[token.symbol] = Number(token.amount || 0);
      });

      const snapshotStore = balanceSnapshotsRef.current;
      const walletAddress = wallet.address.toLowerCase();
      if (!snapshotStore.address || snapshotStore.address.toLowerCase() !== walletAddress) {
        snapshotStore.address = walletAddress;
        snapshotStore.networks = {};
      }

      const previousSnapshot = snapshotStore.networks?.[activeNetwork.id];
      const depositEntries = [];
      const nowIso = new Date().toISOString();
      const minimumDelta = 0.00000001;

      Object.entries(nextSnapshot).forEach(([symbol, nextAmount], index) => {
        if (!Number.isFinite(nextAmount) || nextAmount <= 0) return;
        const previousAmount = Number(previousSnapshot?.[symbol] ?? 0);
        if (!Number.isFinite(previousAmount)) return;
        const deltaAmount = nextAmount - previousAmount;
        if (deltaAmount <= minimumDelta) return;
        depositEntries.push({
          id: `${Date.now()}-${activeNetwork.id}-${symbol}-${index}`,
          type: "receive",
          direction: "deposit",
          hash: "",
          status: previousSnapshot ? "Confirmed" : "Detected",
          networkName: activeNetwork.name,
          explorerTxBaseUrl: activeNetwork.explorerTxBaseUrl,
          symbol,
          amount: formatAmount(deltaAmount),
          fromAddress: "",
          toAddress: wallet.address,
          createdAt: nowIso,
        });
      });

      snapshotStore.networks[activeNetwork.id] = nextSnapshot;
      balanceSnapshotsRef.current = snapshotStore;
      saveBalanceSnapshots(snapshotStore);

      if (depositEntries.length > 0) {
        setActivity((previous) => [...depositEntries, ...previous].slice(0, 80));
        setNotice(
          depositEntries.length === 1
            ? `${depositEntries[0].amount} ${depositEntries[0].symbol} deposit detected.`
            : `${depositEntries.length} deposits detected.`
        );
      }

      setBalances({
        loading: false,
        error: "",
        nativeAmount: result.nativeAmount,
        tokenBalances: result.tokenBalances,
      });
    } catch (balanceError) {
      setBalances((previous) => ({
        ...previous,
        loading: false,
        error: "Could not reach RPC right now. Try refresh.",
      }));
    }
  }

  async function refreshGasPrice() {
    if (!wallet) return;
    setGasBusy(true);
    try {
      const gasHex = await rpcWithFallback(activeNetwork.rpcUrls, "eth_gasPrice", []);
      const gwei = formatUnits(BigInt(gasHex), 9);
      setGasGwei(Number(gwei).toFixed(2));
    } catch (gasError) {
      setGasGwei("");
    } finally {
      setGasBusy(false);
    }
  }

  async function refreshMarketPrices(showLoading = false) {
    setPriceState((previous) => ({
      ...previous,
      loading: showLoading || previous.loading,
      error: "",
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const ids = [...new Set(["ethereum", "polygon-ecosystem-token", "matic-network", ...TOKEN_CATALOG.map((token) => token.id)])];
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        ids.join(",")
      )}&vs_currencies=usd&include_last_updated_at=true&include_24hr_change=true`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Price API ${response.status}`);
      }
      const body = await response.json();
      const eth = Number(body?.ethereum?.usd);
      const pol = Number(body?.["polygon-ecosystem-token"]?.usd ?? body?.["matic-network"]?.usd);
      if (![eth, pol].every((value) => Number.isFinite(value) && value > 0)) {
        throw new Error("Incomplete price data");
      }

      const nextBySymbol = {
        ...DEFAULT_PRICES,
        ETH: eth,
        POL: pol,
      };
      const nextChangeBySymbol = {};
      const ethChange = Number(body?.ethereum?.usd_24h_change);
      const polChange = Number(body?.["polygon-ecosystem-token"]?.usd_24h_change ?? body?.["matic-network"]?.usd_24h_change);
      if (Number.isFinite(ethChange)) nextChangeBySymbol.ETH = ethChange;
      if (Number.isFinite(polChange)) nextChangeBySymbol.POL = polChange;

      TOKEN_CATALOG.forEach((token) => {
        const tokenPrice = Number(body?.[token.id]?.usd);
        const tokenChange = Number(body?.[token.id]?.usd_24h_change);
        if (Number.isFinite(tokenPrice) && tokenPrice > 0) {
          nextBySymbol[token.symbol] = tokenPrice;
        }
        if (Number.isFinite(tokenChange)) {
          nextChangeBySymbol[token.symbol] = tokenChange;
        }
      });

      setPriceState((previous) => ({
        ...previous,
        loading: false,
        error: "",
        source: "coingecko",
        updatedAt: new Date().toISOString(),
        bySymbol: {
          ...previous.bySymbol,
          ...nextBySymbol,
        },
        changeBySymbol: {
          ...previous.changeBySymbol,
          ...nextChangeBySymbol,
        },
      }));
    } catch (priceError) {
      setPriceState((previous) => ({
        ...previous,
        loading: false,
        error: "Using cached/fallback prices for now.",
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  async function estimateSendFees() {
    if (!wallet || !sendModalOpen) return;

    const selectedAsset = resolveSendAsset();
    const toAddress = sendToAddress.trim();
    if (!selectedAsset || !isAddress(toAddress) || !sendAmount || Number(sendAmount) <= 0) {
      setFeePreview({
        loading: false,
        error: "Enter recipient, asset, and amount to preview fees.",
        gasLimit: "",
        gasPriceGwei: "",
        networkFeeNative: "",
        networkFeeUsd: "",
        sendValueUsd: "",
        totalDebitText: "",
      });
      return;
    }

    let parsedAmount;
    try {
      parsedAmount = parseUnits(sendAmount, selectedAsset.decimals);
      if (parsedAmount <= 0n) {
        throw new Error("invalid amount");
      }
    } catch (parseError) {
      setFeePreview({
        loading: false,
        error: "Amount format is invalid.",
        gasLimit: "",
        gasPriceGwei: "",
        networkFeeNative: "",
        networkFeeUsd: "",
        sendValueUsd: "",
        totalDebitText: "",
      });
      return;
    }

    setFeePreview((previous) => ({ ...previous, loading: true, error: "" }));
    try {
      const provider = await getWorkingProvider(activeNetwork);
      const feeData = await provider.getFeeData();
      const fallbackGasPriceHex = await rpcWithFallback(activeNetwork.rpcUrls, "eth_gasPrice", []);
      const gasPrice = feeData.gasPrice ?? BigInt(fallbackGasPriceHex);

      let gasEstimate;
      if (selectedAsset.type === "native") {
        gasEstimate = await provider.estimateGas({
          from: wallet.address,
          to: toAddress,
          value: parsedAmount,
        });
      } else {
        const transferData = ERC20_TRANSFER_INTERFACE.encodeFunctionData("transfer", [toAddress, parsedAmount]);
        gasEstimate = await provider.estimateGas({
          from: wallet.address,
          to: selectedAsset.contract,
          data: transferData,
        });
      }

      const gasLimit = (gasEstimate * 120n) / 100n;
      const networkFeeWei = gasLimit * gasPrice;
      const networkFeeNative = formatUnits(networkFeeWei, 18);
      const gasPriceGwei = formatUnits(gasPrice, 9);
      const nativeUsdPrice = priceState.bySymbol[activeNetwork.symbol] || 0;
      const assetUsdPrice = priceState.bySymbol[selectedAsset.symbol] || 0;
      const networkFeeUsd = Number(networkFeeNative) * nativeUsdPrice;
      const sendValueUsd = Number(sendAmount) * assetUsdPrice;
      const totalDebitText =
        selectedAsset.type === "native"
          ? `${formatAmount(Number(sendAmount) + Number(networkFeeNative))} ${activeNetwork.symbol} total`
          : `${formatAmount(sendAmount)} ${selectedAsset.symbol} + ${formatAmount(networkFeeNative)} ${activeNetwork.symbol} fee`;

      setFeePreview({
        loading: false,
        error: "",
        gasLimit: gasLimit.toString(),
        gasPriceGwei,
        networkFeeNative,
        networkFeeUsd: String(networkFeeUsd),
        sendValueUsd: String(sendValueUsd),
        totalDebitText,
      });
    } catch (estimateError) {
      setFeePreview({
        loading: false,
        error: "Fee estimation unavailable. RPC may be busy.",
        gasLimit: "",
        gasPriceGwei: "",
        networkFeeNative: "",
        networkFeeUsd: "",
        sendValueUsd: "",
        totalDebitText: "",
      });
    }
  }

  function addActivityEntry(entry) {
    setActivity((previous) => [entry, ...previous].slice(0, 80));
  }

  function patchActivityStatus(hash, status) {
    setActivity((previous) =>
      previous.map((item) => (item.hash === hash ? { ...item, status, updatedAt: new Date().toISOString() } : item))
    );
  }

  function addContact() {
    const normalizedName = contactName.trim();
    const normalizedAddress = contactAddress.trim();
    if (!normalizedName) {
      setError("Contact name is required.");
      return;
    }
    if (!isAddress(normalizedAddress)) {
      setError("Contact address is invalid.");
      return;
    }
    if (contacts.some((contact) => contact.address.toLowerCase() === normalizedAddress.toLowerCase())) {
      setError("Contact address already exists.");
      return;
    }

    const nextContact = {
      id: `${Date.now()}`,
      name: normalizedName,
      address: normalizedAddress,
      createdAt: new Date().toISOString(),
    };
    setContacts((previous) => [nextContact, ...previous].slice(0, 40));
    setContactName("");
    setContactAddress("");
    setNotice("Contact saved.");
  }

  function removeContact(contactId) {
    setContacts((previous) => previous.filter((contact) => contact.id !== contactId));
  }

  function toggleTrackedToken(tokenId) {
    setTrackedTokenIds((previous) => {
      const exists = previous.includes(tokenId);
      if (exists) {
        const next = previous.filter((id) => id !== tokenId);
        return next.length > 0 ? next : previous;
      }
      return [...previous, tokenId];
    });
  }

  function resetTrackedTokensToDefault() {
    setTrackedTokenIds(DEFAULT_TRACKED_TOKEN_IDS);
  }

  function useContactAddress(address) {
    setSendToAddress(address);
    setSendModalOpen(true);
    setNotice("Recipient filled from contacts.");
  }

  function openSendModal() {
    setSendModalOpen(true);
  }

  function closeSendModal() {
    if (sendState.loading) return;
    setSendModalOpen(false);
  }

  function isScrollAtTop() {
    const walletScrollTop = walletScrollRef.current?.scrollTop;
    if (typeof walletScrollTop === "number") {
      return walletScrollTop <= 0;
    }
    const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
    return currentScroll <= 0;
  }

  function handleWalletTouchStart(event) {
    if (view !== "wallet" || pullRefreshing) return;
    if (!isScrollAtTop()) return;
    pullStartYRef.current = event.touches?.[0]?.clientY ?? null;
  }

  function handleWalletTouchMove(event) {
    if (view !== "wallet" || pullRefreshing) return;
    if (pullStartYRef.current === null) return;
    const currentY = event.touches?.[0]?.clientY;
    if (typeof currentY !== "number") return;
    const delta = currentY - pullStartYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    const distance = Math.min(PULL_MAX, delta * 0.55);
    if (distance > 0) {
      event.preventDefault();
    }
    setPullDistance(distance);
  }

  async function triggerPullRefresh() {
    if (pullRefreshing || !wallet || view !== "wallet") return;
    setPullRefreshing(true);
    setPullDistance(58);
    await Promise.allSettled([refreshBalances(), refreshGasPrice(), refreshMarketPrices(false)]);
    setPullRefreshing(false);
    setPullDistance(0);
    setNotice("Updated.");
  }

  function handleWalletTouchEnd() {
    if (pullStartYRef.current === null) return;
    pullStartYRef.current = null;
    if (pullDistance >= PULL_TRIGGER) {
      triggerPullRefresh();
      return;
    }
    setPullDistance(0);
  }

  function triggerBrandSuccess() {
    if (brandSignalTimeoutRef.current) {
      clearTimeout(brandSignalTimeoutRef.current);
    }
    setBrandSignal("success");
    brandSignalTimeoutRef.current = setTimeout(() => {
      setBrandSignal("idle");
    }, 2200);
  }

  function hasBiometricSupport() {
    return Boolean(window.isSecureContext && window.PublicKeyCredential && navigator?.credentials);
  }

  async function canUsePlatformAuthenticator() {
    if (!hasBiometricSupport()) return false;
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
      return true;
    }
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      return false;
    }
  }

  async function verifyWithBiometrics(contextLabel = "confirm this action") {
    if (!biometricEnabled) return true;
    if (!hasBiometricSupport() || !biometricPreference?.credentialId) {
      setError("Biometric auth is unavailable on this device.");
      return false;
    }

    setBiometricBusy(true);
    setError("");
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomBytesArray(32),
          timeout: 60000,
          userVerification: "required",
          allowCredentials: [
            {
              id: fromBase64Url(biometricPreference.credentialId),
              type: "public-key",
            },
          ],
        },
      });
      if (!assertion) {
        throw new Error("No biometric assertion");
      }
      return true;
    } catch (biometricError) {
      if (biometricError?.name === "NotAllowedError") {
        setError(`Biometric check canceled. Please scan to ${contextLabel}.`);
      } else {
        setError("Biometric verification failed.");
      }
      return false;
    } finally {
      setBiometricBusy(false);
    }
  }

  async function enableBiometricAuth() {
    if (!vault) {
      setError("Create or import a wallet first.");
      return;
    }

    if (!hasBiometricSupport()) {
      setError("Biometrics require HTTPS and a supported mobile device/browser.");
      return;
    }

    const platformAvailable = await canUsePlatformAuthenticator();
    if (!platformAvailable) {
      setError("No platform authenticator found for Face ID or fingerprint.");
      return;
    }

    setBiometricBusy(true);
    setError("");
    try {
      const userId = new TextEncoder().encode(vault.address.toLowerCase()).slice(0, 32);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomBytesArray(32),
          rp: {
            name: "Cryptrail Wallet",
          },
          user: {
            id: userId,
            name: `wallet-${shortAddress(vault.address)}`,
            displayName: `Cryptrail ${shortAddress(vault.address)}`,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "preferred",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "none",
        },
      });

      if (!credential?.rawId) {
        throw new Error("Credential registration failed");
      }

      const nextPreference = {
        enabled: true,
        credentialId: toBase64Url(credential.rawId),
        address: vault.address,
        createdAt: new Date().toISOString(),
      };
      saveBiometricPreference(nextPreference);
      setBiometricPreference(nextPreference);
      setNotice("Face ID / fingerprint enabled.");
    } catch (biometricError) {
      if (biometricError?.name === "NotAllowedError") {
        setError("Biometric setup canceled.");
      } else if (biometricError?.name === "InvalidStateError") {
        setError("Biometric credential already exists on this device.");
      } else {
        setError("Could not enable biometric authentication.");
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  function disableBiometricAuth() {
    clearBiometricPreference();
    setBiometricPreference(null);
    setNotice("Biometric authentication disabled.");
  }

  async function verifyBiometricOnUnlock() {
    const verified = await verifyWithBiometrics("unlock your wallet");
    if (verified) {
      setNotice("Biometric verified. Enter passcode to unlock.");
    }
  }

  async function copyToClipboard(text, successMessage = "Copied successfully.") {
    try {
      await navigator.clipboard.writeText(text);
      setError("");
      setNotice(successMessage);
      return true;
    } catch (clipboardError) {
      setError("Clipboard access failed.");
      return false;
    }
  }

  async function copyAddress() {
    if (!activeAddress) return;
    await copyToClipboard(activeAddress);
  }

  async function copyReceiveText() {
    if (!activeAddress) return;
    const receiveText = `${activeAddress}\nNetwork: ${activeNetwork.name}\nAssets: ${supportedAssetSymbols}`;
    await copyToClipboard(receiveText);
  }

  async function copyPaymentRequest() {
    if (!activeAddress) return;
    const amountPart = requestAmount ? `${requestAmount} ${requestAsset?.symbol || "USDC"}` : "custom amount";
    const notePart = requestNote ? `\nNote: ${requestNote.trim()}` : "";
    const requestText = `Payment request\nNetwork: ${activeNetwork.name}\nTo: ${activeAddress}\nAmount: ${amountPart}${notePart}`;
    await copyToClipboard(requestText);
  }

  function resolveSendAsset() {
    return sendAssets.find((asset) => asset.key === sendAssetKey) || sendAssets[0];
  }

  async function sendTransaction() {
    if (!wallet) {
      setError("Unlock your wallet first.");
      return;
    }

    const toAddress = sendToAddress.trim();
    if (!isAddress(toAddress)) {
      setError("Recipient address is invalid.");
      return;
    }

    if (toAddress.toLowerCase() === wallet.address.toLowerCase()) {
      setError("Recipient must be different from your wallet address.");
      return;
    }

    if (!sendAmount || Number(sendAmount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    const selectedAsset = resolveSendAsset();
    if (!selectedAsset) {
      setError("Select an asset to send.");
      return;
    }

    let value;
    try {
      value = parseUnits(sendAmount, selectedAsset.decimals);
      if (value <= 0n) {
        setError("Amount must be greater than zero.");
        return;
      }
    } catch (parseError) {
      setError("Amount format is invalid for this asset.");
      return;
    }

    if (biometricEnabled) {
      const biometricApproved = await verifyWithBiometrics("send this transaction");
      if (!biometricApproved) {
        return;
      }
    }

    setSendState({ loading: true, hash: "", status: "" });
    setBrandSignal("sending");
    setError("");

    try {
      const provider = await getWorkingProvider(activeNetwork);
      const signer = wallet.connect(provider);

      let txResponse;
      if (selectedAsset.type === "native") {
        txResponse = await signer.sendTransaction({
          to: toAddress,
          value,
        });
      } else {
        const transferData = ERC20_TRANSFER_INTERFACE.encodeFunctionData("transfer", [toAddress, value]);
        const gasEstimate = await provider.estimateGas({
          from: wallet.address,
          to: selectedAsset.contract,
          data: transferData,
        });
        txResponse = await signer.sendTransaction({
          to: selectedAsset.contract,
          data: transferData,
          gasLimit: (gasEstimate * 120n) / 100n,
        });
      }

      setSendAmount("");
      setSendState({
        loading: false,
        hash: txResponse.hash,
        status: "Broadcasted",
      });
      setSendModalOpen(false);
      setWalletTab("activity");
      addActivityEntry({
        id: `${Date.now()}`,
        type: "send",
        direction: "withdrawal",
        hash: txResponse.hash,
        status: "Broadcasted",
        networkName: activeNetwork.name,
        explorerTxBaseUrl: activeNetwork.explorerTxBaseUrl,
        symbol: selectedAsset.symbol,
        amount: sendAmount,
        fromAddress: wallet.address,
        toAddress,
        createdAt: new Date().toISOString(),
      });
      setNotice("Transaction broadcasted.");

      txResponse
        .wait(1)
        .then(() => {
          setSendState((current) => ({ ...current, status: "Confirmed" }));
          patchActivityStatus(txResponse.hash, "Confirmed");
          setNotice("Transaction confirmed.");
          triggerBrandSuccess();
          refreshBalances();
        })
        .catch(() => {
          setSendState((current) => ({ ...current, status: "Pending confirmation" }));
          patchActivityStatus(txResponse.hash, "Pending confirmation");
          setBrandSignal("idle");
        });
    } catch (txError) {
      setSendState({ loading: false, hash: "", status: "" });
      setBrandSignal("idle");
      const reason = txError?.shortMessage || txError?.message || "Transaction failed.";
      setError(reason.slice(0, 140));
    }
  }

  function renderHeader() {
    return (
      <header className="app-header">
        <div className="brand">
          <div className={`brand-mark ${brandSignal}`}>
            <IconShield />
            <span className="brand-state" aria-hidden="true">
              {brandSignal === "sending" ? <span className="brand-spinner"></span> : null}
              {brandSignal === "success" ? <IconMiniCheck /> : null}
            </span>
          </div>
          <div>
            <strong>Cryptrail</strong>
            <span>Wallet</span>
          </div>
        </div>
        {view === "wallet" ? (
          <button className="ghost-btn" type="button" onClick={lockWallet}>
            <IconLock />
            Lock
          </button>
        ) : null}
      </header>
    );
  }

  function renderWelcome() {
    return (
      <section className="screen">
        <div className="panel panel-large">
          <p className="label">Secure Start</p>
          <h1>Your crypto wallet, built for control.</h1>
          <p className="support">Create a new wallet or import an existing one using a seed phrase or private key.</p>
          <div className="stack">
            <button className="primary-btn" type="button" onClick={startCreateFlow}>
              <IconPlus />
              Create New Wallet
            </button>
            <button className="secondary-btn" type="button" onClick={startImportFlow}>
              <IconKey />
              Import Existing Wallet
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderCreate() {
    const words = generatedPhrase ? generatedPhrase.split(" ") : [];
    return (
      <section className="screen">
        <div className="panel">
          <p className="label">Create Wallet</p>
          <h2>Choose recovery phrase length</h2>
          <div className="segment">
            <button
              type="button"
              className={wordCount === 12 ? "active" : ""}
              onClick={() => setWordCount(12)}
            >
              12 words
            </button>
            <button
              type="button"
              className={wordCount === 24 ? "active" : ""}
              onClick={() => setWordCount(24)}
            >
              24 words
            </button>
          </div>
          <button className="secondary-btn full" type="button" onClick={generateNewWallet}>
            <IconReload />
            Generate Phrase
          </button>
          {words.length > 0 ? (
            <>
              <div className="phrase-grid">
                {words.map((word, index) => (
                  <div key={`${word}-${index}`} className="phrase-chip">
                    <span>{index + 1}</span>
                    <strong>{word}</strong>
                  </div>
                ))}
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={backupConfirmed}
                  onChange={(event) => setBackupConfirmed(event.target.checked)}
                />
                <span>I saved this phrase offline in the correct order.</span>
              </label>
              <button className="primary-btn full" type="button" onClick={preparePasscodeStep}>
                Continue
              </button>
            </>
          ) : (
            <p className="hint">Generate your phrase to continue.</p>
          )}
          <button className="text-btn" type="button" onClick={() => setView("welcome")}>
            Back
          </button>
        </div>
      </section>
    );
  }

  function renderImport() {
    return (
      <section className="screen">
        <div className="panel">
          <p className="label">Import Wallet</p>
          <h2>Choose import method</h2>
          <div className="segment">
            <button
              type="button"
              className={setupMode === "import-phrase" ? "active" : ""}
              onClick={() => setSetupMode("import-phrase")}
            >
              Seed phrase
            </button>
            <button
              type="button"
              className={setupMode === "import-private" ? "active" : ""}
              onClick={() => setSetupMode("import-private")}
            >
              Private key
            </button>
          </div>

          {setupMode === "import-phrase" ? (
            <>
              <label className="field-label" htmlFor="import-phrase">
                12 or 24 words
              </label>
              <textarea
                id="import-phrase"
                value={importPhrase}
                onChange={(event) => setImportPhrase(event.target.value)}
                rows={4}
                placeholder="word1 word2 word3 ..."
              />
              <button className="primary-btn full" type="button" onClick={handleImportPhrase}>
                Continue
              </button>
            </>
          ) : (
            <>
              <label className="field-label" htmlFor="import-pk">
                Private key
              </label>
              <input
                id="import-pk"
                type="password"
                value={importPrivateKey}
                onChange={(event) => setImportPrivateKey(event.target.value)}
                placeholder="0x..."
              />
              <button className="primary-btn full" type="button" onClick={handleImportPrivateKey}>
                Continue
              </button>
            </>
          )}

          <button className="text-btn" type="button" onClick={() => setView("welcome")}>
            Back
          </button>
        </div>
      </section>
    );
  }

  function renderPasscode() {
    return (
      <section className="screen">
        <div className="panel">
          <p className="label">Passcode</p>
          <h2>Create 6-digit passcode</h2>
          <label className="field-label" htmlFor="passcode">
            Passcode
          </label>
          <input
            id="passcode"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={passcode}
            onChange={(event) => setPasscode(event.target.value.replace(/\D/g, ""))}
            placeholder="******"
          />
          <label className="field-label" htmlFor="confirm-passcode">
            Confirm passcode
          </label>
          <input
            id="confirm-passcode"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPasscode}
            onChange={(event) => setConfirmPasscode(event.target.value.replace(/\D/g, ""))}
            placeholder="******"
          />
          <button className="primary-btn full" type="button" onClick={continueToSecurityCheck}>
            Continue
          </button>
        </div>
      </section>
    );
  }

  function renderSecurityCheck() {
    const phraseWords = generatedPhrase.split(" ");
    return (
      <section className="screen">
        <div className="panel">
          <p className="label">Security Check</p>
          <h2>Confirm sensitive details</h2>
          <label className="field-label" htmlFor="security-passcode">
            Enter passcode again
          </label>
          <input
            id="security-passcode"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={securityPasscode}
            onChange={(event) => setSecurityPasscode(event.target.value.replace(/\D/g, ""))}
            placeholder="******"
          />

          {isPhraseMode(setupMode) ? (
            <div className="word-check-grid">
              {verifyIndexes.map((index) => (
                <div key={index}>
                  <label className="field-label" htmlFor={`word-${index}`}>
                    Word #{index + 1}
                  </label>
                  <input
                    id={`word-${index}`}
                    type="text"
                    value={securityWords[index] || ""}
                    onChange={(event) =>
                      setSecurityWords((previous) => ({
                        ...previous,
                        [index]: event.target.value.toLowerCase().trim(),
                      }))
                    }
                    placeholder={`Enter word ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              <label className="field-label" htmlFor="security-private-key">
                Re-enter private key
              </label>
              <input
                id="security-private-key"
                type="password"
                value={securityPrivateKey}
                onChange={(event) => setSecurityPrivateKey(event.target.value)}
                placeholder="0x..."
              />
            </>
          )}

          {isPhraseMode(setupMode) ? (
            <p className="hint">You will not be shown this phrase again after setup.</p>
          ) : (
            <p className="hint">This check verifies that the key import is intentional.</p>
          )}

          <button className="primary-btn full" type="button" disabled={busy} onClick={finishSetup}>
            {busy ? "Securing wallet..." : "Finish setup"}
          </button>
          <button className="text-btn" type="button" onClick={() => setView("passcode")}>
            Back
          </button>
          {isPhraseMode(setupMode) && phraseWords.length > 0 ? (
            <details className="details">
              <summary>View phrase one last time</summary>
              <p>{generatedPhrase}</p>
            </details>
          ) : null}
        </div>
      </section>
    );
  }

  function renderUnlock() {
    return (
      <section className="screen unlock-screen">
        <div className="panel panel-large unlock-panel">
          <p className="label">Unlock Wallet</p>
          <h2>{shortAddress(vault?.address)}</h2>
          <p className="support">Enter your passcode to decrypt this wallet on this device.</p>
          <label className="field-label" htmlFor="unlock-passcode">
            Passcode
          </label>
          <input
            id="unlock-passcode"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={unlockPasscode}
            onChange={(event) => setUnlockPasscode(event.target.value.replace(/\D/g, ""))}
            placeholder="******"
          />
          <button className="primary-btn full" type="button" disabled={busy} onClick={unlockWallet}>
            {busy ? "Unlocking..." : "Unlock"}
          </button>
          {biometricEnabled ? (
            <button className="secondary-btn full" type="button" disabled={busy || biometricBusy} onClick={verifyBiometricOnUnlock}>
              <IconFingerprint />
              {biometricBusy ? "Scanning..." : "Use Face ID / Fingerprint"}
            </button>
          ) : null}
          <button className="text-btn danger" type="button" onClick={resetLocalWallet}>
            Remove local wallet data
          </button>
        </div>
      </section>
    );
  }

  function renderWallet() {
    const txExplorerUrl = sendState.hash ? `${activeNetwork.explorerTxBaseUrl}${sendState.hash}` : "";
    const normalizedSendTo = sendToAddress.trim().toLowerCase();
    const tokenNameBySymbol = TOKEN_CATALOG.reduce(
      (map, token) => ({ ...map, [token.symbol]: token.name }),
      { [activeNetwork.symbol]: activeNetwork.name }
    );
    const homeAssets = [
      {
        symbol: activeNetwork.symbol,
        name: tokenNameBySymbol[activeNetwork.symbol] || activeNetwork.name,
        amount: balances.nativeAmount,
      },
      ...balances.tokenBalances.map((token) => ({
        symbol: token.symbol,
        name: tokenNameBySymbol[token.symbol] || token.symbol,
        amount: token.amount,
      })),
    ].map((asset) => {
      const amountNumber = Number(asset.amount || 0);
      const usdRate = Number(priceState.bySymbol[asset.symbol] || 0);
      const change = Number(priceState.changeBySymbol?.[asset.symbol] || 0);
      return {
        ...asset,
        usdRate,
        change,
        usdValue: Number.isFinite(amountNumber) ? amountNumber * usdRate : 0,
      };
    });
    const tokenRows = TOKEN_CATALOG.map((token) => ({
      ...token,
      tracked: trackedTokenIds.includes(token.id),
      rate: priceState.bySymbol[token.symbol] || 0,
      change: Number(priceState.changeBySymbol?.[token.symbol] || 0),
      availableOnChain: Boolean(token.contracts?.[activeNetwork.id]),
    })).sort((a, b) => Number(b.tracked) - Number(a.tracked) || b.rate - a.rate);
    const featuredTokens = tokenRows.filter((token) => token.tracked).slice(0, 4);
    const hasFundedAssets = homeAssets.some((asset) => Number(asset.amount) > 0);
    const visibleHomeAssets = (hasFundedAssets ? homeAssets.filter((asset) => Number(asset.amount) > 0) : homeAssets)
      .slice()
      .sort((a, b) => b.usdValue - a.usdValue);
    const normalizedActiveAddress = activeAddress.trim().toLowerCase();
    const normalizedActivity = activity.map((entry) => {
      const fromAddress = String(entry.fromAddress || "").toLowerCase();
      const toAddress = String(entry.toAddress || "").toLowerCase();
      const inferredDirection =
        entry.direction ||
        (entry.type === "receive"
          ? "deposit"
          : entry.type === "send"
            ? "withdrawal"
            : toAddress && toAddress === normalizedActiveAddress
              ? "deposit"
              : "withdrawal");
      return {
        ...entry,
        direction: inferredDirection,
      };
    });
    const filteredActivity =
      activityFilter === "all"
        ? normalizedActivity
        : normalizedActivity.filter((entry) => entry.direction === activityFilter);
    const { dailyPnlUsd, previousDayUsd } = homeAssets.reduce(
      (acc, asset) => {
        const currentUsd = Number(asset.usdValue);
        if (!Number.isFinite(currentUsd) || currentUsd <= 0) {
          return acc;
        }
        const rawChange = Number(asset.change);
        const changeRatio = Number.isFinite(rawChange) ? rawChange / 100 : 0;
        const safeRatio = changeRatio <= -0.9999 ? -0.9999 : changeRatio;
        const previousUsd = currentUsd / (1 + safeRatio);
        const pnlUsd = currentUsd - previousUsd;
        return {
          dailyPnlUsd: acc.dailyPnlUsd + pnlUsd,
          previousDayUsd: acc.previousDayUsd + previousUsd,
        };
      },
      { dailyPnlUsd: 0, previousDayUsd: 0 }
    );
    const dailyPnlPct = previousDayUsd > 0 ? (dailyPnlUsd / previousDayUsd) * 100 : 0;
    const pullReady = pullDistance >= PULL_TRIGGER;
    const pullVisible = pullRefreshing || pullDistance > 0;
    const navItems = [
      { key: "home", label: "Home", icon: <IconHome /> },
      { key: "tokens", label: "Tokens", icon: <IconTrending /> },
      { key: "receive", label: "Receive", icon: <IconCopy /> },
      { key: "activity", label: "Activity", icon: <IconClock /> },
      { key: "contacts", label: "Contacts", icon: <IconUsers /> },
    ];
    const quickActions = [
      { key: "send", label: "Send", icon: <IconSend />, onClick: openSendModal },
      { key: "receive", label: "Receive", icon: <IconCopy />, onClick: () => setWalletTab("receive") },
      { key: "tokens", label: "Tokens", icon: <IconTrending />, onClick: () => setWalletTab("tokens") },
      { key: "activity", label: "Activity", icon: <IconClock />, onClick: () => setWalletTab("activity") },
    ];

    return (
      <section
        ref={walletScrollRef}
        className="screen wallet-screen liquid-wallet"
        onTouchStart={handleWalletTouchStart}
        onTouchMove={handleWalletTouchMove}
        onTouchEnd={handleWalletTouchEnd}
        onTouchCancel={handleWalletTouchEnd}
      >
        <div
          className={`pull-refresh-indicator ${pullVisible ? "visible" : ""} ${pullReady ? "ready" : ""} ${
            pullRefreshing ? "refreshing" : ""
          }`}
          style={{ height: pullRefreshing ? "58px" : `${Math.min(58, pullDistance)}px` }}
        >
          <span className="pull-refresh-spinner" aria-hidden="true"></span>
          <small>{pullRefreshing ? "Refreshing wallet..." : pullReady ? "Release to refresh" : "Pull down to refresh"}</small>
        </div>
        <div className="wallet-topbar">
          <button className="liquid-icon-btn" type="button" onClick={() => setWalletTab("tools")} aria-label="Open tools">
            <IconSettings />
          </button>
          <div className="wallet-title">
            <div className={`brand-mark ${brandSignal}`}>
              <IconShield />
              <span className="brand-state" aria-hidden="true">
                {brandSignal === "sending" ? <span className="brand-spinner"></span> : null}
                {brandSignal === "success" ? <IconMiniCheck /> : null}
              </span>
            </div>
            <div>
              <strong>Main Wallet 1</strong>
              <small>{shortAddress(activeAddress)}</small>
            </div>
          </div>
          <button
            className="liquid-icon-btn liquid-icon-btn-accent"
            type="button"
            onClick={() => setWalletTab("tokens")}
            aria-label="Open token watchlist"
          >
            <IconSearch />
          </button>
        </div>

        <div className="wallet-balance-hero">
          <h1>{formatUsd(usdBalance)}</h1>
          <p className={dailyPnlUsd < 0 ? "down" : dailyPnlUsd > 0 ? "up" : ""}>
            {formatSignedUsd(dailyPnlUsd)} ({formatPercent(dailyPnlPct)})
          </p>
        </div>

        <div className="network-switch-row" ref={networkMenuRef}>
          <label>Network</label>
          <button
            className={`network-picker-trigger ${networkMenuOpen ? "open" : ""}`}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={networkMenuOpen}
            onClick={() => setNetworkMenuOpen((current) => !current)}
          >
            <span>{activeNetwork.name}</span>
            <IconChevronDown />
          </button>
          {networkMenuOpen ? (
            <div className="network-picker-menu" role="listbox" aria-label="Select network">
              {ACTIVE_NETWORKS.map((network) => (
                <button
                  key={network.id}
                  type="button"
                  className={`network-picker-option ${network.id === networkId ? "active" : ""}`}
                  onClick={() => {
                    setNetworkId(network.id);
                    setNetworkMenuOpen(false);
                  }}
                >
                  <span>{network.name}</span>
                  {network.id === networkId ? <IconMiniCheck /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="wallet-address-chip">
          <span>{shortAddress(activeAddress)}</span>
          <button type="button" onClick={copyAddress}>
            <IconCopy />
            Copy
          </button>
        </div>

        <div className="wallet-action-row">
          {quickActions.map((action) => (
            <button key={action.key} className="wallet-action-btn" type="button" onClick={action.onClick}>
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {walletTab === "home" ? (
          <div className="panel wallet-content-panel">
            <div className="row-between">
              <h3>Assets</h3>
              <small className="section-subtitle">{balances.loading ? "Syncing..." : "Pull down to refresh"}</small>
            </div>
            <div className="wallet-asset-list">
              {visibleHomeAssets.map((asset) => (
                <article className="wallet-asset-row" key={asset.symbol}>
                  <div className="wallet-asset-avatar">
                    <TokenIcon symbol={asset.symbol} name={asset.name} />
                  </div>
                  <div className="wallet-asset-meta">
                    <strong>{asset.symbol}</strong>
                    <p>{asset.name}</p>
                    <small>
                      {formatUsdRate(asset.usdRate)}{" "}
                      <span className={asset.change < 0 ? "down" : asset.change > 0 ? "up" : ""}>
                        {formatPercent(asset.change)}
                      </span>
                    </small>
                  </div>
                  <div className="wallet-asset-value">
                    <strong>{formatAmount(asset.amount)}</strong>
                    <p>{formatUsd(asset.usdValue)}</p>
                  </div>
                </article>
              ))}
            </div>
            {balances.error ? <p className="error-text">{balances.error}</p> : null}
          </div>
        ) : null}

        {walletTab === "tokens" ? (
          <div className="panel wallet-content-panel">
            <div className="row-between">
              <h3>Watchlist</h3>
              <button className="ghost-btn" type="button" disabled={priceState.loading} onClick={() => refreshMarketPrices(true)}>
                <IconReload />
                {priceState.loading ? "Updating..." : "Refresh"}
              </button>
            </div>
            <p className="hint">
              Tracked: {trackedTokenIds.length} / {TOKEN_CATALOG.length} top-market tokens
            </p>
            <div className="alpha-token-strip compact">
              {featuredTokens.map((token) => (
                <article className="alpha-token-card" key={token.id}>
                  <div className="alpha-token-head">
                    <TokenIcon symbol={token.symbol} name={token.name} />
                    <strong>{token.symbol}</strong>
                  </div>
                  <span>{formatUsdRate(token.rate)}</span>
                  <small className={token.change < 0 ? "down" : token.change > 0 ? "up" : ""}>{formatPercent(token.change)}</small>
                </article>
              ))}
            </div>
            <div className="token-list">
              {tokenRows.map((token) => (
                <div className="token-row" key={token.id}>
                  <div className="token-row-main">
                    <TokenIcon symbol={token.symbol} name={token.name} />
                    <div>
                      <strong>{token.symbol}</strong>
                      <p>{token.name}</p>
                      <small>
                        1 {token.symbol} = {formatUsdRate(token.rate)} •{" "}
                        <span className={token.change < 0 ? "down" : token.change > 0 ? "up" : ""}>{formatPercent(token.change)}</span>
                        {token.availableOnChain ? ` • available on ${activeNetwork.name}` : " • price only"}
                      </small>
                    </div>
                  </div>
                  <button
                    className={token.tracked ? "ghost-btn" : "secondary-btn"}
                    type="button"
                    onClick={() => toggleTrackedToken(token.id)}
                  >
                    {token.tracked ? "Tracked" : "Add"}
                  </button>
                </div>
              ))}
            </div>
            <p className="hint">
              Source: {priceState.source === "coingecko" ? "CoinGecko API" : "fallback cache"}
              {priceState.updatedAt ? ` • Updated ${new Date(priceState.updatedAt).toLocaleTimeString()}` : ""}
            </p>
            <button className="text-btn" type="button" onClick={resetTrackedTokensToDefault}>
              Reset defaults
            </button>
            {priceState.error ? <p className="error-text">{priceState.error}</p> : null}
          </div>
        ) : null}

        {walletTab === "receive" ? (
          <div className="panel wallet-content-panel">
            <div className="row-between section-head">
              <div>
                <h3>Receive</h3>
                <p className="section-subtitle">Share your wallet address or create a payment request.</p>
              </div>
              <button className="ghost-btn" type="button" onClick={copyReceiveText}>
                <IconCopy />
                Copy
              </button>
            </div>
            <div className="receive-box">
              <div className="receive-box-top">
                <p>Network</p>
                <span>{activeNetwork.name}</span>
              </div>
              <strong className="receive-address">{activeAddress}</strong>
              <small className="receive-assets">{supportedAssetSummary} supported</small>
            </div>
            <div className="mini-heading">Create Request</div>
            <label className="field-label" htmlFor="request-amount">
              Amount (optional)
            </label>
            <input
              id="request-amount"
              type="text"
              inputMode="decimal"
              value={requestAmount}
              onChange={(event) => setRequestAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
            />
            <label className="field-label">Asset</label>
            <div className={`segment receive-segment ${sendAssets.length > 2 ? "segment-3" : ""}`}>
              {sendAssets.map((asset) => (
                <button
                  key={asset.key}
                  type="button"
                  className={asset.key === requestAssetKey ? "active" : ""}
                  onClick={() => setRequestAssetKey(asset.key)}
                >
                  {asset.symbol}
                </button>
              ))}
            </div>
            <label className="field-label" htmlFor="request-note">
              Note (optional)
            </label>
            <input
              id="request-note"
              type="text"
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              placeholder="Invoice #124"
            />
            <button className="secondary-btn full" type="button" onClick={copyPaymentRequest}>
              <IconCopy />
              Copy Payment Request
            </button>
            <p className="hint request-summary">Requesting {requestAmount || "custom"} {requestAsset?.symbol || "USDC"}.</p>
          </div>
        ) : null}

        {walletTab === "activity" ? (
          <div className="panel wallet-content-panel">
            <div className="row-between section-head">
              <div>
                <h3>Transactions</h3>
                <p className="section-subtitle">Track deposits and withdrawals across your wallet.</p>
              </div>
              {activity.length > 0 ? (
                <button className="text-btn danger" type="button" onClick={() => setActivity([])}>
                  Clear
                </button>
              ) : null}
            </div>
            <div className="activity-filter">
              <button type="button" className={activityFilter === "all" ? "active" : ""} onClick={() => setActivityFilter("all")}>
                All
              </button>
              <button
                type="button"
                className={activityFilter === "deposit" ? "active" : ""}
                onClick={() => setActivityFilter("deposit")}
              >
                Deposits
              </button>
              <button
                type="button"
                className={activityFilter === "withdrawal" ? "active" : ""}
                onClick={() => setActivityFilter("withdrawal")}
              >
                Withdrawals
              </button>
            </div>
            {filteredActivity.length === 0 ? (
              <p className="hint activity-empty">
                {activity.length === 0
                  ? "Your transactions will appear here."
                  : activityFilter === "deposit"
                    ? "No deposit transactions yet."
                    : activityFilter === "withdrawal"
                      ? "No withdrawal transactions yet."
                      : "No transactions yet."}
              </p>
            ) : (
              filteredActivity.map((entry) => {
                const isDeposit = entry.direction === "deposit";
                const counterpartyAddress = isDeposit ? entry.fromAddress : entry.toAddress;
                const counterpartyLabel = isAddress(counterpartyAddress || "")
                  ? shortAddress(counterpartyAddress)
                  : isDeposit
                    ? "External wallet"
                    : "Unknown";
                return (
                  <article className="activity-entry" key={entry.id}>
                    <div className="activity-entry-main">
                      <span className={`tx-type-badge ${entry.direction === "deposit" ? "deposit" : "withdrawal"}`}>
                        {entry.direction === "deposit" ? "Deposit" : "Withdrawal"}
                      </span>
                      <strong>
                        {entry.amount} {entry.symbol}
                      </strong>
                      <p>
                        {isDeposit ? "From" : "To"} {counterpartyLabel} on {entry.networkName}
                      </p>
                      <small>
                        {new Date(entry.createdAt).toLocaleDateString()}{" "}
                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </small>
                    </div>
                    <div className="activity-entry-side">
                      <span className={`status-dot ${entry.status === "Confirmed" ? "ok" : ""}`}>{entry.status}</span>
                      {entry.hash ? (
                        <a href={`${entry.explorerTxBaseUrl || activeNetwork.explorerTxBaseUrl}${entry.hash}`} target="_blank" rel="noreferrer">
                          {shortAddress(entry.hash)}
                        </a>
                      ) : (
                        <span className="activity-meta">Balance scan</span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        ) : null}

        {walletTab === "contacts" ? (
          <div className="panel wallet-content-panel">
            <h3>Contacts</h3>
            <label className="field-label" htmlFor="contact-name">
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Alice"
            />
            <label className="field-label" htmlFor="contact-address">
              Address
            </label>
            <input
              id="contact-address"
              type="text"
              value={contactAddress}
              onChange={(event) => setContactAddress(event.target.value)}
              placeholder="0x..."
            />
            <button className="secondary-btn full" type="button" onClick={addContact}>
              <IconPlus />
              Save Contact
            </button>
            <div className="contact-list">
              {contacts.length === 0 ? <p className="hint">No contacts yet.</p> : null}
              {contacts.map((contact) => (
                <div className="contact-row" key={contact.id}>
                  <div>
                    <strong>{contact.name}</strong>
                    <p>{shortAddress(contact.address)}</p>
                  </div>
                  <div className="contact-actions">
                    <button className="ghost-btn" type="button" onClick={() => useContactAddress(contact.address)}>
                      Use
                    </button>
                    <button className="text-btn danger" type="button" onClick={() => removeContact(contact.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {walletTab === "tools" ? (
          <div className="panel wallet-content-panel">
            <h3>Wallet Tools</h3>
            <div className="tool-grid">
              <article>
                <p>Gas Tracker</p>
                <strong>{gasGwei ? `${gasGwei} gwei` : "--"}</strong>
                <button className="ghost-btn" type="button" disabled={gasBusy} onClick={refreshGasPrice}>
                  <IconReload />
                  {gasBusy ? "Checking..." : "Refresh"}
                </button>
              </article>
              <article>
                <p>Security</p>
                <strong>{biometricEnabled ? "Passcode + biometrics active" : "Passcode lock active"}</strong>
                <div className="tool-actions">
                  <button className="ghost-btn" type="button" onClick={lockWallet}>
                    <IconLock />
                    Lock Now
                  </button>
                  {biometricEnabled ? (
                    <button className="ghost-btn" type="button" onClick={disableBiometricAuth}>
                      <IconKey />
                      Disable Biometrics
                    </button>
                  ) : (
                    <button className="ghost-btn" type="button" disabled={biometricBusy} onClick={enableBiometricAuth}>
                      <IconFingerprint />
                      {biometricBusy ? "Enabling..." : "Enable Face ID / Fingerprint"}
                    </button>
                  )}
                </div>
              </article>
              <article>
                <p>Explorer</p>
                <strong>{activeNetwork.name}</strong>
                <a href={activeNetwork.explorerTxBaseUrl.replace("/tx/", "/")} target="_blank" rel="noreferrer">
                  Open block explorer
                </a>
              </article>
            </div>
          </div>
        ) : null}

        <div className="wallet-bottom-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={walletTab === item.key ? "active" : ""}
              onClick={() => setWalletTab(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {sendModalOpen ? (
          <div className="send-modal-layer" role="dialog" aria-modal="true" aria-label="Send crypto window">
            <div className="send-modal">
              <div className="row-between">
                <h3>Send Crypto</h3>
                <button className="ghost-btn" type="button" onClick={closeSendModal} disabled={sendState.loading}>
                  Close
                </button>
              </div>
              <p className="hint">Network: {activeNetwork.name}</p>

              <label className="field-label" htmlFor="send-address-modal">
                Recipient address
              </label>
              <input
                id="send-address-modal"
                type="text"
                value={sendToAddress}
                onChange={(event) => setSendToAddress(event.target.value)}
                placeholder="0x..."
              />
              {contacts.length > 0 ? (
                <div className="contact-pills">
                  {contacts.slice(0, 4).map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      className={normalizedSendTo === contact.address.toLowerCase() ? "active" : ""}
                      onClick={() => setSendToAddress(contact.address)}
                    >
                      {contact.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="field-label">Asset</label>
              <div className={`segment ${sendAssets.length > 2 ? "segment-3" : ""}`}>
                {sendAssets.map((asset) => (
                  <button
                    key={asset.key}
                    type="button"
                    className={asset.key === sendAssetKey ? "active" : ""}
                    onClick={() => setSendAssetKey(asset.key)}
                  >
                    {asset.symbol}
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="send-amount-modal">
                Amount
              </label>
              <input
                id="send-amount-modal"
                type="text"
                inputMode="decimal"
                value={sendAmount}
                onChange={(event) => setSendAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
              />

              <div className="send-fee-box">
                <div className="row-between">
                  <strong>Commission & Fee Preview</strong>
                  <button className="ghost-btn" type="button" onClick={estimateSendFees} disabled={feePreview.loading}>
                    {feePreview.loading ? "Estimating..." : "Recalculate"}
                  </button>
                </div>
                {feePreview.error ? (
                  <p className="hint">{feePreview.error}</p>
                ) : (
                  <div className="fee-grid">
                    <div>
                      <span>Asset value</span>
                      <strong>{formatUsd(feePreview.sendValueUsd)}</strong>
                    </div>
                    <div>
                      <span>Network fee</span>
                      <strong>
                        {feePreview.networkFeeNative ? `${formatAmount(feePreview.networkFeeNative)} ${activeNetwork.symbol}` : "--"}
                      </strong>
                    </div>
                    <div>
                      <span>Fee (USD)</span>
                      <strong>{formatUsd(feePreview.networkFeeUsd)}</strong>
                    </div>
                    <div>
                      <span>Gas price</span>
                      <strong>{feePreview.gasPriceGwei ? `${formatAmount(feePreview.gasPriceGwei)} gwei` : "--"}</strong>
                    </div>
                    <div>
                      <span>Gas limit</span>
                      <strong>{feePreview.gasLimit || "--"}</strong>
                    </div>
                    <div>
                      <span>Total debit</span>
                      <strong>{feePreview.totalDebitText || "--"}</strong>
                    </div>
                  </div>
                )}
              </div>

              <button className="primary-btn full" type="button" disabled={sendState.loading} onClick={sendTransaction}>
                <IconSend />
                {sendState.loading ? "Sending..." : "Send Now"}
              </button>
              <p className="hint">Confirm recipient and network carefully before broadcasting.</p>
              {sendState.hash ? (
                <div className="tx-inline">
                  <span>{sendState.status}</span>
                  <a href={txExplorerUrl} target="_blank" rel="noreferrer">
                    {shortAddress(sendState.hash)}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  const toast = error
    ? {
        type: "error",
        title: "Action failed",
        message: error,
        icon: <IconAlert />,
      }
    : notice
      ? {
          type: "ok",
          title: "Done",
          message: notice,
          icon: <IconCheck />,
        }
      : null;
  const isDarkToneView = view === "wallet" || view === "unlock";

  return (
    <div className="app-bg">
      <div className={`app-shell ${view === "wallet" || view === "unlock" ? "app-shell-wallet" : ""}`}>
        {view !== "wallet" ? renderHeader() : null}
        {view === "welcome" && renderWelcome()}
        {view === "create" && renderCreate()}
        {view === "import" && renderImport()}
        {view === "passcode" && renderPasscode()}
        {view === "security-check" && renderSecurityCheck()}
        {view === "unlock" && renderUnlock()}
        {view === "wallet" && renderWallet()}
        {view === "loading" ? <p className="support center">Loading wallet...</p> : null}

        {toast ? (
          <div className={`toast toast-${toast.type} ${isDarkToneView ? "toast-toned" : ""}`} role="status" aria-live="polite">
            <div className="toast-icon">{toast.icon}</div>
            <div className="toast-body">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L4 6v6c0 5.3 3.7 9.6 8 10 4.3-.4 8-4.7 8-10V6l-8-4Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="12" r="3" />
      <path d="M11 12h9M16 9v6M20 10v4" />
    </svg>
  );
}

function IconFingerprint() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4a6 6 0 0 0-6 6v2" />
      <path d="M18 10v2a6 6 0 0 1-6 6" />
      <path d="M8.5 10v2.5a3.5 3.5 0 0 0 7 0V10" />
      <path d="M12 7.5a2.5 2.5 0 0 0-2.5 2.5v2" />
      <path d="M14.5 10v2.5a2.5 2.5 0 0 1-5 0" />
      <path d="M5 12v1.5a7 7 0 0 0 14 0V12" />
    </svg>
  );
}

function IconReload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v6h-6" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <rect x="5" y="5" width="10" height="10" rx="2" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.3 1.3 0 0 1 0 1.8l-1.2 1.2a1.3 1.3 0 0 1-1.8 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.3 1.3 0 0 1-1.3 1.3h-1.6A1.3 1.3 0 0 1 9.7 20v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.3 1.3 0 0 1-1.8 0l-1.2-1.2a1.3 1.3 0 0 1 0-1.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4A1.3 1.3 0 0 1 2.7 13v-2A1.3 1.3 0 0 1 4 9.7h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.3 1.3 0 0 1 0-1.8l1.2-1.2a1.3 1.3 0 0 1 1.8 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4A1.3 1.3 0 0 1 11 2.7h2A1.3 1.3 0 0 1 14.3 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.3 1.3 0 0 1 1.8 0l1.2 1.2a1.3 1.3 0 0 1 0 1.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.3 1.3 0 0 1 21.3 11v2a1.3 1.3 0 0 1-1.3 1.3h-.2a1 1 0 0 0-.9.6Z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 11 9-7 9 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

function IconTrending() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 17 6-6 4 4 7-7" />
      <path d="M14 8h6v6" />
    </svg>
  );
}

function TokenIcon({ symbol, name }) {
  const [broken, setBroken] = useState(false);
  const iconKey = (TOKEN_ICON_SYMBOL_MAP[symbol] || symbol || "").toLowerCase();
  const iconUrl = `${TOKEN_ICON_BASE_URL}/${iconKey}.png`;

  if (broken || !iconKey) {
    return <span className="token-icon-fallback">{(symbol || "?").slice(0, 1)}</span>;
  }

  return (
    <img
      className="token-icon-img"
      src={iconUrl}
      alt={`${name || symbol} logo`}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v5M12 18h.01" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.7 2.7L16 9.5" />
    </svg>
  );
}

function IconMiniCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7.5 12.5 3 3L16.5 9.8" />
    </svg>
  );
}
