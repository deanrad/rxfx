import * as RxAjax from 'rxjs/ajax';
import { of } from 'rxjs';

import { fetchMany } from '../src/fetchMany';
import { usersResponse } from './users.mock';

jest.mock('rxjs/ajax');

describe(fetchMany, () => {
  it('delivers an Observable of objects at the given key in the body of a response', () => {
    jest.spyOn(RxAjax, 'ajax').mockReturnValue(of({ response: usersResponse }));

    const users = [];

    const result = fetchMany(
      {
        url: '/users',
      },
      'users'
    );

    // Our synchronous Observable mock is ready right away
    result.subscribe({
      next(u) {
        users.push(u);
      },
      error(e) {
        expect(e).toBeUndefined();
      },
    });

    expect(users).toEqual(usersResponse.users);
  });
});
