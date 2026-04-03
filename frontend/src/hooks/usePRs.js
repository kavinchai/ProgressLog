import useFetch from './useFetch';

export default function usePRs() {
  return useFetch('/progress/prs');
}
