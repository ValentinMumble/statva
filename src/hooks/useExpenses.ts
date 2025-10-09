import {useEffect, useState} from 'react';
import {BikeExpense} from '../models';
import {useFetcher} from '../hooks';

const useExpenses = (): [BikeExpense[], () => void] => {
  const [expenses, setExpenses] = useState<BikeExpense[]>([]);
  const getExpenses = useFetcher<BikeExpense[]>('expenses.get');

  const fetchExpenses = async () => setExpenses(await getExpenses());

  useEffect(() => {
    fetchExpenses();
  }, [getExpenses]);

  return [expenses, fetchExpenses];
};

export {useExpenses};
