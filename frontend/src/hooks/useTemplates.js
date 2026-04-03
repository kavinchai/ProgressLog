import useFetch from './useFetch';

export default function useTemplates() {
  return useFetch('/templates');
}
