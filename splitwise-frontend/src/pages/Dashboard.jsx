import { useState, useEffect } from "react";
import { TopNav } from "../components/TopNav";
import { Sidebar } from "../components/Sidebar";
import { BalanceCards } from "../components/BalanceCards";
import { SettleUpPanel } from "../components/SettleUpPanel";
import { ExpenseList } from "../components/ExpenseList";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { NewGroupModal } from "../components/NewGroupModal";
import { AddMemberModal } from "../components/AddMemberModal";
import { Loading, ErrorState } from "../components/Status";
import { useGroups } from "../hooks/useGroups";
import { useGroupFinances } from "../hooks/useGroupFinances";
import { useMembers } from "../hooks/useMembers";
import * as groupsApi from "../api/groups";
import * as settlementsApi from "../api/settlements";
import { useAuth } from "../context/AuthContext";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { user } = useAuth();
  const { groups, loading: groupsLoading, error: groupsError, refetch: refetchGroups, createGroup } = useGroups();

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Default to the first group once groups have loaded.
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const { members, refetch: refetchMembers } = useMembers(selectedGroupId);

  const {
    expenses,
    balances,
    settleUp,
    loading: financesLoading,
    error: financesError,
    refetch: refetchFinances,
    addExpense,
    deleteExpense,
  } = useGroupFinances(selectedGroupId);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  async function handleRecordPayment(suggestion) {
    await settlementsApi.recordSettlement({
      groupId: selectedGroupId,
      toUserId: suggestion.toUserId,
      amountCents: suggestion.amountCents,
      currency: suggestion.currency,
    });
    refetchFinances();
  }

  return (
    <div className={styles.page}>
      <TopNav />
      <div className={styles.body}>
        <Sidebar
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          onNewGroup={() => setShowNewGroup(true)}
        />

        <main className={styles.content}>
          {groupsLoading && <Loading label="Loading groups..." />}
          {groupsError && <ErrorState message={groupsError} onRetry={refetchGroups} />}

          {!groupsLoading && !groupsError && groups.length === 0 && (
            <p className={styles.emptyGroups}>
              You're not in any groups yet. Create one to start splitting expenses.
            </p>
          )}

          {selectedGroup && (
            <>
              <div className={styles.contentHeader}>
                <span className={styles.groupName}>{selectedGroup.name}</span>
                <div className={styles.headerActions}>
                  <button className={styles.secondaryButton} onClick={() => setShowAddMember(true)}>
                    + Member
                  </button>
                  <button className={styles.addButton} onClick={() => setShowAddExpense(true)}>
                    + Add expense
                  </button>
                </div>
              </div>

              {financesLoading && <Loading label="Loading expenses..." />}
              {financesError && <ErrorState message={financesError} onRetry={refetchFinances} />}

              {!financesLoading && !financesError && (
                <>
                  <BalanceCards
                    balances={balances}
                    members={members}
                    currentUserId={user?.id}
                    currency={selectedGroup.defaultCurrency}
                  />
                  <SettleUpPanel
                    suggestions={settleUp}
                    members={members}
                    currency={selectedGroup.defaultCurrency}
                    onRecordPayment={handleRecordPayment}
                  />
                  <ExpenseList expenses={expenses} members={members} onDelete={deleteExpense} />
                </>
              )}
            </>
          )}
        </main>
      </div>

      {showAddExpense && selectedGroup && (
        <AddExpenseModal
          members={members}
          defaultCurrency={selectedGroup.defaultCurrency}
          onClose={() => setShowAddExpense(false)}
          onSubmit={addExpense}
        />
      )}

      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onSubmit={async (payload) => {
            const newGroup = await createGroup(payload);
            setSelectedGroupId(newGroup.id);
          }}
        />
      )}

      {showAddMember && selectedGroup && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onSubmit={async ({ email }) => {
            await groupsApi.addMember(selectedGroupId, { email });
            await refetchMembers();
          }}
        />
      )}
    </div>
  );
}