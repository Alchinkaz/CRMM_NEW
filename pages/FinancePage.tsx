
import React from 'react';
import { User, Client, Transaction, FinancialAccount } from '../types';
import { FinanceManager } from '../components/FinanceManager';

interface FinancePageProps {
  user: User;
  clients: Client[];
  onAddClient: (client: Client) => void;
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[]) => void;
  accounts: FinancialAccount[];
  onUpdateAccounts: (accounts: FinancialAccount[]) => void;
}

export const FinancePage: React.FC<FinancePageProps> = ({ 
    user, 
    clients, 
    onAddClient,
    transactions,
    onUpdateTransactions,
    accounts,
    onUpdateAccounts
}) => {
  return (
    <FinanceManager 
        user={user} 
        clients={clients} 
        onAddClient={onAddClient}
        transactions={transactions}
        onUpdateTransactions={onUpdateTransactions}
        accounts={accounts}
        onUpdateAccounts={onUpdateAccounts}
    />
  );
};
