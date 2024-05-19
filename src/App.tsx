/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import { Todo } from './types/Todo';
import { TodoStatus } from './types/TodoStatus';
import * as todosService from './api/todos';

// const ERROR_CLASSNAMES =
//   'notification is-danger is-light has-text-weight-normal';

const filterFunction = (todos: Todo[], chosenFilter: TodoStatus) => {
  switch (chosenFilter) {
    case TodoStatus.active:
      return todos.filter(todo => !todo.completed);
    case TodoStatus.completed:
      return todos.filter(todo => todo.completed);
    default:
      return todos;
  }
};

export const App: React.FC = () => {
  const [todosFromServer, setTodosFromServer] = useState<Todo[]>([]);
  const [filterType, setFilterType] = useState(TodoStatus.all);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filtredTodos, setFiltredTodos] = useState<Todo[]>([]);
  const [loader, setLoader] = useState<number[] | null>(null);
  const [title, setTitle] = useState('');
  const [addingTodo, setAddingTodo] = useState<boolean>(false);
  const [errorid, setErrorid] = useState(0);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const itemsLeft = todosFromServer.filter(todo => !todo.completed);
  const completedItems = todosFromServer.filter(todo => todo.completed);

  useEffect(() => {
    todosService
      .getTodos()
      .then(todos => setTodosFromServer(todos))
      .catch(() => {
        setErrorMessage('Unable to load todos');
        setErrorid(errorid + 1);
      });
  }, []);

  useEffect(
    () => setFiltredTodos(() => filterFunction(todosFromServer, filterType)),
    [todosFromServer, filterType],
  );

  useEffect(() => {
    if (loader === null && !addingTodo && !editingTodoId) {
      inputRef.current?.focus();
    }
  }, [loader, addingTodo, editingTodoId]);

  const handleDelete = (todoId: number) => {
    setLoader([todoId]);
    todosService
      .deleteTodo(todoId)
      .then(() =>
        setTodosFromServer(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        ),
      )
      .catch(() => {
        setErrorid(errorid + 1);
        setErrorMessage('Unable to delete a todo');
      })
      .finally(() => setLoader(null));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setErrorMessage(null);
    event.preventDefault();
    const id = Math.floor(Math.random() * 100000);
    const newTodo = {
      title: title.trim(),
      completed: false,
      id: id,
      userId: USER_ID,
    };

    if (title.trim() === '') {
      setErrorid(errorid + 1);
      setErrorMessage('Title should not be empty');

      return;
    }

    setAddingTodo(true);

    return todosService
      .addTodo(newTodo)
      .then(createdTodo => {
        setTodosFromServer(currentTodos => [...currentTodos, createdTodo]);
        setTitle('');
      })
      .catch(error => {
        setErrorid(errorid + 1);
        setErrorMessage('Unable to add a todo');
        throw error;
      })
      .finally(() => {
        setAddingTodo(false);
      });
  };

  const onUpdateTodoStatus = (updatedTodo: Todo) => {
    setLoader([updatedTodo.id]);

    return todosService
      .patchTodo({ ...updatedTodo, completed: !updatedTodo.completed })
      .then(todo => {
        setTodosFromServer(currentTodos => {
          const newTodos = [...currentTodos];
          const index = newTodos.findIndex(
            currentTodo => currentTodo.id === updatedTodo.id,
          );

          newTodos.splice(index, 1, { ...todo });

          return newTodos;
        });
      })
      .catch(error => {
        setErrorid(errorid + 1);
        setErrorMessage('Unable to update a todo');
        throw error;
      })
      .finally(() => {
        setLoader(null);
      });
  };

  const updateToCompletedTodos = (todos: Todo[]) => {
    setLoader(todos.map(todo => todo.id));

    todos.map(todo => {
      todosService
        .patchTodo({ ...todo, completed: !todo.completed })
        .then(singleTodo => {
          setTodosFromServer(currentTodos => {
            const newTodos = [...currentTodos];
            const index = newTodos.findIndex(
              currentTodo => currentTodo.id === todo.id,
            );

            newTodos.splice(index, 1, { ...singleTodo });

            return newTodos;
          });
        })
        .finally(() => setLoader(null));
    });
  };

  const onDeleteAllCompleted = (todos: Todo[]) => {
    setLoader(todos.map(todo => todo.id));

    todos.map(todo =>
      todosService
        .deleteTodo(todo.id)
        .then(() =>
          setTodosFromServer(currentTodos =>
            currentTodos.filter(singleTodo => todo.id !== singleTodo.id),
          ),
        )
        .catch(() => {
          setErrorMessage('Unable to delete a todo');
          setErrorid(errorid + 1);
        })
        .finally(() => setLoader(null)),
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setErrorMessage('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorid]);

  const handleEdit = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(event.target.value);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingTodoId === null) {
      return;
    }

    const updatedTodo = todosFromServer.find(todo => todo.id === editingTodoId);

    if (!updatedTodo) {
      return;
    }

    if (editingTitle.trim() === updatedTodo.title) {
      setEditingTodoId(null);

      return;
    }

    if (editingTitle.trim() === '') {
      handleDelete(editingTodoId);

      return;
    }

    setLoader([editingTodoId]);
    todosService
      .patchTodo({
        ...updatedTodo,
        title: editingTitle.trim(),
      })
      .then(todo => {
        setTodosFromServer(currentTodos => {
          const newTodos = [...currentTodos];
          const index = newTodos.findIndex(t => t.id === editingTodoId);

          setEditingTodoId(null);

          newTodos[index] = todo;

          return newTodos;
        });
      })
      .catch(error => {
        setErrorid(errorid + 1);
        setErrorMessage('Unable to update a todo');
        throw error;
      })
      .finally(() => {
        setLoader(null);
      });
  };

  const handleEditBlur = () => {
    if (editingTodoId !== null) {
      handleEditSubmit({
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>);
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Отменить редактирование задачи при нажатии на "Esc"
        setEditingTodoId(null);
      }
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          {todosFromServer.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: itemsLeft.length === 0,
              })}
              data-cy="ToggleAllButton"
              onClick={() =>
                updateToCompletedTodos(
                  itemsLeft.length > 0 ? itemsLeft : completedItems,
                )
              }
            />
          )}

          {/* Add a todo on form submit */}
          <form onSubmit={onSubmit}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={addingTodo || loader !== null}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {/* This is a completed todo */}
          {filtredTodos.map(todo => (
            <div
              data-cy="Todo"
              className={todo.completed ? 'todo completed' : 'todo'}
              key={todo.id}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onClick={() => onUpdateTodoStatus(todo)}
                  disabled={loader !== null}
                />
              </label>

              {editingTodoId === todo.id ? (
                <form onSubmit={handleEditSubmit}>
                  <input
                    data-cy="TodoTitleField"
                    type="text"
                    className="todo__title-field"
                    value={editingTitle}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    autoFocus
                  />
                </form>
              ) : (
                <span
                  data-cy="TodoTitle"
                  className="todo__title"
                  onDoubleClick={() => handleEdit(todo)}
                >
                  {todo.title}
                </span>
              )}

              {/* Remove button appears only on hover */}
              {editingTodoId !== todo.id && (
                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  onClick={() => handleDelete(todo.id)}
                >
                  ×
                </button>
              )}

              {/* overlay will cover the todo while it is being deleted or updated */}
              <div
                data-cy="TodoLoader"
                className={classNames('modal overlay', {
                  'is-active': loader?.includes(todo.id),
                })}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
          {addingTodo && (
            <div data-cy="Todo" className="todo">
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {title}
              </span>

              {/* Remove button appears only on hover */}
              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
              >
                ×
              </button>

              {/* overlay will cover the todo while it is being deleted or updated */}
              <div data-cy="TodoLoader" className="modal overlay is-active">
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          )}
        </section>

        {/* Hide the footer if there are no todos "filter__link selected"*/}
        {todosFromServer.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {itemsLeft.length} items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: TodoStatus.all === filterType,
                })}
                data-cy="FilterLinkAll"
                onClick={() => setFilterType(TodoStatus.all)}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: TodoStatus.active === filterType,
                })}
                data-cy="FilterLinkActive"
                onClick={() => setFilterType(TodoStatus.active)}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: TodoStatus.completed === filterType,
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilterType(TodoStatus.completed)}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={completedItems.length === 0}
              onClick={() => onDeleteAllCompleted(completedItems)}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          {
            hidden: !errorMessage,
          },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage(null)}
        />
        {/* show only one message at a time */}
        {errorMessage}
      </div>
    </div>
  );
};

{
  /* <div>
  Unable to load todos
          <br />
          Title should not be empty
          <br />
          Unable to add a todo
          <br />
          Unable to delete a todo
          <br />
          Unable to update a todo
  </div> */
}

// {/* <section className="todoapp__main" data-cy="TodoList"> */ }
// {/* This is a completed todo */ }
// <div data-cy="Todo" className="todo completed">
//   <label className="todo__status-label">
//     <input
//       data-cy="TodoStatus"
//       type="checkbox"
//       className="todo__status"
//       checked
//     />
//   </label>

//   <span data-cy="TodoTitle" className="todo__title">
//     Completed Todo
//   </span>

//   {/* Remove button appears only on hover */}
//   <button type="button" className="todo__remove" data-cy="TodoDelete">
//     ×
//   </button>

//   {/* overlay will cover the todo while it is being deleted or updated */}
//   <div data-cy="TodoLoader" className="modal overlay">
//     <div className="modal-background has-background-white-ter" />
//     <div className="loader" />
//   </div>
// </div>

// {/* This todo is an active todo */ }
// <div data-cy="Todo" className="todo">
//   <label className="todo__status-label">
//     <input
//       data-cy="TodoStatus"
//       type="checkbox"
//       className="todo__status"
//     />
//   </label>

//   <span data-cy="TodoTitle" className="todo__title">
//     Not Completed Todo
//   </span>
//   <button type="button" className="todo__remove" data-cy="TodoDelete">
//     ×
//   </button>

//   <div data-cy="TodoLoader" className="modal overlay">
//     <div className="modal-background has-background-white-ter" />
//     <div className="loader" />
//   </div>
// </div>

// {/* This todo is being edited */ }
// <div data-cy="Todo" className="todo">
//   <label className="todo__status-label">
//     <input
//       data-cy="TodoStatus"
//       type="checkbox"
//       className="todo__status"
//     />
//   </label>

//   {/* This form is shown instead of the title and remove button */}
//   <form>
//     <input
//       data-cy="TodoTitleField"
//       type="text"
//       className="todo__title-field"
//       placeholder="Empty todo will be deleted"
//       value="Todo is being edited now"
//     />
//   </form>

//   <div data-cy="TodoLoader" className="modal overlay">
//     <div className="modal-background has-background-white-ter" />
//     <div className="loader" />
//   </div>
// </div>

// {/* This todo is in loadind state */ }
// <div data-cy="Todo" className="todo">
//   <label className="todo__status-label">
//     <input
//       data-cy="TodoStatus"
//       type="checkbox"
//       className="todo__status"
//     />
//   </label>

//   <span data-cy="TodoTitle" className="todo__title">
//     Todo is being saved now
//   </span>

//   <button type="button" className="todo__remove" data-cy="TodoDelete">
//     ×
//   </button>

//   {/* 'is-active' class puts this modal on top of the todo */}
//   <div data-cy="TodoLoader" className="modal overlay is-active">
//     <div className="modal-background has-background-white-ter" />
//     <div className="loader" />
//   </div>
// </div>
// {/* </section> */ }
