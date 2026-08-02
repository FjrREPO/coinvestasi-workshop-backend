// ABI (Application Binary Interface) = "kamus" antara kode TS dan smart contract
// Kita cuma butuh 3: factory, escrow, token

export const bountyFactoryAbi = [
  // function createBounty(uint256 rewardAmount, string rulesURI, uint256 submissionDeadline) returns (address)
  {
    type: "function",
    name: "createBounty",
    inputs: [
      { name: "rewardAmount", type: "uint256" },
      { name: "rulesURI", type: "string" },
      { name: "submissionDeadline", type: "uint256" },
    ],
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
  },
  // view = read-only, gak pake gas(fees)
  { type: "function", name: "totalBounties", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // bantuan buat frontend: ambil alamat escrow by id
  { type: "function", name: "bounties", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }], stateMutability: "view" },
  // event = log yang di-emit kontrak (ini yang kita index!)
  {
    type: "event", name: "BountyCreated",
    inputs: [
      { name: "bountyId", type: "uint256", indexed: true },  // indexed = bisa di-filter
      { name: "escrow", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "rewardAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const bountyEscrowAbi = [
  { type: "function", name: "submitWork", inputs: [{ name: "proofURI", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "status", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "creator", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "rewardAmount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "rulesURI", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "worker", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "proofURI", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  {
    type: "event", name: "WorkSubmitted",
    inputs: [
      { name: "worker", type: "address", indexed: true },
      { name: "proofURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event", name: "RewardReleased",
    inputs: [
      { name: "worker", type: "address", indexed: true },
      { name: "rewardAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "WorkRejected",
    inputs: [{ name: "worker", type: "address", indexed: true }],
  },
] as const;

export const rewardTokenAbi = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

// Status enum di kontrak (BountyEscrow.sol)
export const statusLabel = ["MenungguDana", "Dibuka", "Disubmit", "Selesai", "Dibatalkan"] as const;
