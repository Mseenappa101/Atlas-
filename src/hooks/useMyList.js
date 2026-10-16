import { useContext } from 'react';
import { MyListContext } from '../context/mylist-context';

export default function useMyList() {
  return useContext(MyListContext);
}
