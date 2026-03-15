import {useQuery} from '@tanstack/react-query';
import {BikeExpense} from '../models';
import {getFetcher} from './useFetcher';

const getExpenses = getFetcher<BikeExpense[]>('expenses.get');

const useExpenses = () => {
  const {data: expenses = [], refetch} = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
  });

  return {expenses, refetch};
};

export {useExpenses};
