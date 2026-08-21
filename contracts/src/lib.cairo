use starknet::ContractAddress;

pub const STATUS_MISSING: u8 = 0;
pub const STATUS_CREATED: u8 = 1;
pub const STATUS_FINALIZED: u8 = 2;
pub const STATUS_CANCELLED: u8 = 3;
pub const MAX_RECIPIENTS: u32 = 5;

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct PayrollRun {
    pub owner: ContractAddress,
    pub token: ContractAddress,
    pub aggregate_amount: u128,
    pub recipient_count: u32,
    pub period_hash: felt252,
    pub merkle_root: felt252,
    pub manifest_hash: felt252,
    pub strk20_tx_hash: felt252,
    pub created_at: u64,
    pub finalized_at: u64,
    pub status: u8,
}

#[starknet::interface]
pub trait IPayrollRegistry<TContractState> {
    fn create_run(
        ref self: TContractState,
        run_id: felt252,
        token: ContractAddress,
        aggregate_amount: u128,
        recipient_count: u32,
        period_hash: felt252,
        merkle_root: felt252,
        manifest_hash: felt252,
    );

    fn finalize_run(ref self: TContractState, run_id: felt252, strk20_tx_hash: felt252);

    fn cancel_run(ref self: TContractState, run_id: felt252);

    fn get_run(self: @TContractState, run_id: felt252) -> PayrollRun;

    fn get_owner_nonce(self: @TContractState, owner: ContractAddress) -> u64;
}

#[starknet::contract]
pub mod PayrollRegistry {
    use core::num::traits::Zero;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use super::{
        IPayrollRegistry, MAX_RECIPIENTS, PayrollRun, STATUS_CANCELLED, STATUS_CREATED,
        STATUS_FINALIZED, STATUS_MISSING,
    };

    #[storage]
    struct Storage {
        runs: Map<felt252, PayrollRun>,
        owner_nonces: Map<ContractAddress, u64>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        PayrollRunCreated: PayrollRunCreated,
        PayrollRunFinalized: PayrollRunFinalized,
        PayrollRunCancelled: PayrollRunCancelled,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PayrollRunCreated {
        #[key]
        pub run_id: felt252,
        #[key]
        pub owner: ContractAddress,
        pub token: ContractAddress,
        pub aggregate_amount: u128,
        pub recipient_count: u32,
        pub period_hash: felt252,
        pub merkle_root: felt252,
        pub manifest_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PayrollRunFinalized {
        #[key]
        pub run_id: felt252,
        #[key]
        pub owner: ContractAddress,
        pub strk20_tx_hash: felt252,
        pub finalized_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PayrollRunCancelled {
        #[key]
        pub run_id: felt252,
        #[key]
        pub owner: ContractAddress,
        pub cancelled_at: u64,
    }

    #[abi(embed_v0)]
    impl PayrollRegistryImpl of IPayrollRegistry<ContractState> {
        fn create_run(
            ref self: ContractState,
            run_id: felt252,
            token: ContractAddress,
            aggregate_amount: u128,
            recipient_count: u32,
            period_hash: felt252,
            merkle_root: felt252,
            manifest_hash: felt252,
        ) {
            let existing = self.runs.read(run_id);
            assert(existing.status == STATUS_MISSING, 'RUN_EXISTS');
            assert(token.is_non_zero(), 'TOKEN_ZERO');
            assert(aggregate_amount > 0, 'AMOUNT_ZERO');
            assert(recipient_count > 0, 'COUNT_ZERO');
            assert(recipient_count <= MAX_RECIPIENTS, 'COUNT_TOO_HIGH');
            assert(merkle_root != 0, 'ROOT_ZERO');
            assert(manifest_hash != 0, 'MANIFEST_ZERO');

            let owner = get_caller_address();
            let created_at = get_block_timestamp();
            let run = PayrollRun {
                owner,
                token,
                aggregate_amount,
                recipient_count,
                period_hash,
                merkle_root,
                manifest_hash,
                strk20_tx_hash: 0,
                created_at,
                finalized_at: 0,
                status: STATUS_CREATED,
            };

            self.runs.write(run_id, run);
            let nonce = self.owner_nonces.read(owner);
            self.owner_nonces.write(owner, nonce + 1);
            self
                .emit(
                    PayrollRunCreated {
                        run_id,
                        owner,
                        token,
                        aggregate_amount,
                        recipient_count,
                        period_hash,
                        merkle_root,
                        manifest_hash,
                    },
                );
        }

        fn finalize_run(ref self: ContractState, run_id: felt252, strk20_tx_hash: felt252) {
            let mut run = self.runs.read(run_id);
            let caller = get_caller_address();
            assert(run.owner == caller, 'NOT_OWNER');
            assert(run.status == STATUS_CREATED, 'BAD_STATUS');
            assert(strk20_tx_hash != 0, 'TX_HASH_ZERO');

            let finalized_at = get_block_timestamp();
            run.strk20_tx_hash = strk20_tx_hash;
            run.finalized_at = finalized_at;
            run.status = STATUS_FINALIZED;
            self.runs.write(run_id, run);
            self.emit(PayrollRunFinalized { run_id, owner: caller, strk20_tx_hash, finalized_at });
        }

        fn cancel_run(ref self: ContractState, run_id: felt252) {
            let mut run = self.runs.read(run_id);
            let caller = get_caller_address();
            assert(run.owner == caller, 'NOT_OWNER');
            assert(run.status == STATUS_CREATED, 'BAD_STATUS');

            run.status = STATUS_CANCELLED;
            self.runs.write(run_id, run);
            self
                .emit(
                    PayrollRunCancelled {
                        run_id, owner: caller, cancelled_at: get_block_timestamp(),
                    },
                );
        }

        fn get_run(self: @ContractState, run_id: felt252) -> PayrollRun {
            self.runs.read(run_id)
        }

        fn get_owner_nonce(self: @ContractState, owner: ContractAddress) -> u64 {
            self.owner_nonces.read(owner)
        }
    }
}
