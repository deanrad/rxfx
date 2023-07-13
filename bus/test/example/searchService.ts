// @ts-nocheck
import { actionCreatorFactory } from '@rxfx/fsa';

const searchAction = actionCreatorFactory('search');
export interface SearchRequest {
  query: string;
  id?: number;
}
export interface SearchLoading {
  request?: { id: number };
}
export interface SearchComplete {
  request?: { id: number };
  result: [string];
}
export interface SearchError extends Error {
  request?: { id: number };
}
/**  An individual result*/
export interface SearchResult {
  result: string;
  request?: { id: number };
}
export interface SearchCanceled {
  request?: { id: number };
}

//#region "Actions We Listen For"
// Input event:
export const searchRequestCreator = searchAction<SearchRequest>('request');
//#endregion

//#region "Actions We Respond With"
/* Output event: we are loading your search.. */
export const loadingCreator = searchAction<SearchLoading>('loading');
/* Output event containing a single search result */
export const resultCreator = searchAction<SearchResult>('result');
/* Output event indicating your search has errored */
export const errorCreator = searchAction<SearchError>('error');
/* Output event indicating your search is complete */
export const completeCreator = searchAction<SearchComplete>('complete');

export const cancelCreator = searchAction<SearchCanceled>('cancel');
