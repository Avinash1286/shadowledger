use core::traits::TryInto;
use shadowledger_registry::{
    IPayrollRegistryDispatcher, IPayrollRegistryDispatcherTrait, MAX_RECIPIENTS, PayrollRegistry,
    STATUS_CANCELLED, STATUS_CREATED, STATUS_FINALIZED, STATUS_MISSING,
};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, EventSpyAssertionsTrait, EventSpyTrait, declare,
    spy_events, start_cheat_block_timestamp, start_cheat_caller_address, stop_cheat_block_timestamp,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;

const RUN_ID: felt252 = 0x111;
const TOKEN: felt252 = 0x222;
const OWNER: felt252 = 0x333;
const ATTACKER: felt252 = 0x444;
const AMOUNT: u128 = 100_000_000_000_000_000_000;
const COUNT: u32 = 3;
const PERIOD_HASH: felt252 = 0x555;
const MERKLE_ROOT: felt252 = 0x666;
const MANIFEST_HASH: felt252 = 0x777;
const STRK20_TX_HASH: felt252 = 0x888;

fn address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn deploy_registry() -> (ContractAddress, IPayrollRegistryDispatcher) {
    let contract = declare("PayrollRegistry").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![]).unwrap();
    (contract_address, IPayrollRegistryDispatcher { contract_address })
}

fn create_default(contract_address: ContractAddress, dispatcher: @IPayrollRegistryDispatcher) {
    start_cheat_caller_address(contract_address, address(OWNER));
    dispatcher
        .create_run(RUN_ID, address(TOKEN), AMOUNT, COUNT, PERIOD_HASH, MERKLE_ROOT, MANIFEST_HASH);
}

#[test]
fn test_create_run_success() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_block_timestamp(contract_address, 1_776_211_200);
    create_default(contract_address, @dispatcher);

    let run = dispatcher.get_run(RUN_ID);
    assert(run.owner == address(OWNER), 'OWNER_MISMATCH');
    assert(run.token == address(TOKEN), 'TOKEN_MISMATCH');
    assert(run.aggregate_amount == AMOUNT, 'AMOUNT_MISMATCH');
    assert(run.recipient_count == COUNT, 'COUNT_MISMATCH');
    assert(run.period_hash == PERIOD_HASH, 'PERIOD_MISMATCH');
    assert(run.merkle_root == MERKLE_ROOT, 'ROOT_MISMATCH');
    assert(run.manifest_hash == MANIFEST_HASH, 'MANIFEST_MISMATCH');
    assert(run.strk20_tx_hash == 0, 'TX_HASH_NOT_ZERO');
    assert(run.created_at == 1_776_211_200, 'CREATED_AT_MISMATCH');
    assert(run.finalized_at == 0, 'FINALIZED_AT_SET');
    assert(run.status == STATUS_CREATED, 'STATUS_MISMATCH');
    assert(dispatcher.get_owner_nonce(address(OWNER)) == 1, 'NONCE_MISMATCH');
}

#[test]
#[should_panic(expected: 'RUN_EXISTS')]
fn test_duplicate_run_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    dispatcher
        .create_run(RUN_ID, address(TOKEN), AMOUNT, COUNT, PERIOD_HASH, MERKLE_ROOT, MANIFEST_HASH);
}

#[test]
#[should_panic(expected: 'TOKEN_ZERO')]
fn test_zero_token_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));
    dispatcher
        .create_run(RUN_ID, address(0), AMOUNT, COUNT, PERIOD_HASH, MERKLE_ROOT, MANIFEST_HASH);
}

#[test]
#[should_panic(expected: 'AMOUNT_ZERO')]
fn test_zero_amount_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));
    dispatcher
        .create_run(RUN_ID, address(TOKEN), 0, COUNT, PERIOD_HASH, MERKLE_ROOT, MANIFEST_HASH);
}

#[test]
#[should_panic(expected: 'COUNT_ZERO')]
fn test_zero_count_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));
    dispatcher
        .create_run(RUN_ID, address(TOKEN), AMOUNT, 0, PERIOD_HASH, MERKLE_ROOT, MANIFEST_HASH);
}

#[test]
#[should_panic(expected: 'COUNT_TOO_HIGH')]
fn test_count_above_max_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));
    dispatcher
        .create_run(
            RUN_ID,
            address(TOKEN),
            AMOUNT,
            MAX_RECIPIENTS + 1,
            PERIOD_HASH,
            MERKLE_ROOT,
            MANIFEST_HASH,
        );
}

#[test]
#[should_panic(expected: 'ROOT_ZERO')]
fn test_zero_root_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));
    dispatcher.create_run(RUN_ID, address(TOKEN), AMOUNT, COUNT, PERIOD_HASH, 0, MANIFEST_HASH);
}

#[test]
#[should_panic(expected: 'MANIFEST_ZERO')]
fn test_zero_manifest_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));
    dispatcher.create_run(RUN_ID, address(TOKEN), AMOUNT, COUNT, PERIOD_HASH, MERKLE_ROOT, 0);
}

#[test]
#[should_panic(expected: 'NOT_OWNER')]
fn test_only_owner_can_finalize() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    stop_cheat_caller_address(contract_address);
    start_cheat_caller_address(contract_address, address(ATTACKER));
    dispatcher.finalize_run(RUN_ID, STRK20_TX_HASH);
}

#[test]
#[should_panic(expected: 'NOT_OWNER')]
fn test_only_owner_can_cancel() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    stop_cheat_caller_address(contract_address);
    start_cheat_caller_address(contract_address, address(ATTACKER));
    dispatcher.cancel_run(RUN_ID);
}

#[test]
fn test_finalize_success() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_block_timestamp(contract_address, 1_776_211_200);
    create_default(contract_address, @dispatcher);
    stop_cheat_block_timestamp(contract_address);
    start_cheat_block_timestamp(contract_address, 1_776_214_800);

    dispatcher.finalize_run(RUN_ID, STRK20_TX_HASH);

    let run = dispatcher.get_run(RUN_ID);
    assert(run.status == STATUS_FINALIZED, 'NOT_FINALIZED');
    assert(run.strk20_tx_hash == STRK20_TX_HASH, 'TX_HASH_MISMATCH');
    assert(run.finalized_at == 1_776_214_800, 'FINALIZED_AT_MISMATCH');
}

#[test]
#[should_panic(expected: 'BAD_STATUS')]
fn test_finalize_twice_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    dispatcher.finalize_run(RUN_ID, STRK20_TX_HASH);
    dispatcher.finalize_run(RUN_ID, STRK20_TX_HASH + 1);
}

#[test]
fn test_cancel_success() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    dispatcher.cancel_run(RUN_ID);

    let run = dispatcher.get_run(RUN_ID);
    assert(run.status == STATUS_CANCELLED, 'NOT_CANCELLED');
    assert(run.strk20_tx_hash == 0, 'TX_HASH_SET');
    assert(run.finalized_at == 0, 'FINALIZED_AT_SET');
}

#[test]
#[should_panic(expected: 'BAD_STATUS')]
fn test_cancel_finalized_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    dispatcher.finalize_run(RUN_ID, STRK20_TX_HASH);
    dispatcher.cancel_run(RUN_ID);
}

#[test]
#[should_panic(expected: 'BAD_STATUS')]
fn test_finalize_cancelled_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    dispatcher.cancel_run(RUN_ID);
    dispatcher.finalize_run(RUN_ID, STRK20_TX_HASH);
}

#[test]
fn test_events_contain_no_recipient_data() {
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));
    let mut spy = spy_events();

    dispatcher
        .create_run(RUN_ID, address(TOKEN), AMOUNT, COUNT, PERIOD_HASH, MERKLE_ROOT, MANIFEST_HASH);

    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    PayrollRegistry::Event::PayrollRunCreated(
                        PayrollRegistry::PayrollRunCreated {
                            run_id: RUN_ID,
                            owner: address(OWNER),
                            token: address(TOKEN),
                            aggregate_amount: AMOUNT,
                            recipient_count: COUNT,
                            period_hash: PERIOD_HASH,
                            merkle_root: MERKLE_ROOT,
                            manifest_hash: MANIFEST_HASH,
                        },
                    ),
                ),
            ],
        );

    let events = spy.get_events();
    assert(events.events.len() == 1, 'EVENT_COUNT');
    let (_, raw_event) = events.events.at(0);
    assert(raw_event.keys.len() == 3, 'UNEXPECTED_EVENT_KEYS');
    assert(raw_event.data.len() == 6, 'UNEXPECTED_EVENT_DATA');
}

#[test]
fn test_missing_run_has_missing_status() {
    let (_, dispatcher) = deploy_registry();
    assert(dispatcher.get_run(0x999).status == STATUS_MISSING, 'NOT_MISSING');
}

#[test]
#[should_panic(expected: 'TX_HASH_ZERO')]
fn test_zero_transaction_hash_reverts() {
    let (contract_address, dispatcher) = deploy_registry();
    create_default(contract_address, @dispatcher);
    dispatcher.finalize_run(RUN_ID, 0);
}

#[test]
#[fuzzer(runs: 64, seed: 20260819)]
fn test_fuzz_valid_amount_and_count_boundaries(amount_seed: u128, count_seed: u32) {
    let amount = if amount_seed == 0 {
        1
    } else {
        amount_seed
    };
    let count = (count_seed % MAX_RECIPIENTS) + 1;
    let (contract_address, dispatcher) = deploy_registry();
    start_cheat_caller_address(contract_address, address(OWNER));

    dispatcher
        .create_run(RUN_ID, address(TOKEN), amount, count, PERIOD_HASH, MERKLE_ROOT, MANIFEST_HASH);

    let run = dispatcher.get_run(RUN_ID);
    assert(run.aggregate_amount == amount, 'FUZZ_AMOUNT');
    assert(run.recipient_count == count, 'FUZZ_COUNT');
    assert(run.recipient_count >= 1, 'FUZZ_COUNT_LOW');
    assert(run.recipient_count <= MAX_RECIPIENTS, 'FUZZ_COUNT_HIGH');
}
