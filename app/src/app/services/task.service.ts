import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task, TaskStats, CreateTaskRequest, UpdateTaskRequest, TaskStatus, User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  private tasksSignal = signal<Task[]>([]);
  private statsSignal = signal<TaskStats>({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  private usersSignal = signal<User[]>([]);
  private loadingSignal = signal<boolean>(false);

  readonly tasks = this.tasksSignal.asReadonly();
  readonly stats = this.statsSignal.asReadonly();
  readonly users = this.usersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadTasks(status?: TaskStatus, assignedTo?: number): Observable<{ tasks: Task[] }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (assignedTo) params = params.set('assigned_to', assignedTo.toString());

    this.loadingSignal.set(true);
    return this.http.get<{ tasks: Task[] }>(this.apiUrl, { params }).pipe(
      tap(response => {
        this.tasksSignal.set(response.tasks);
        this.loadingSignal.set(false);
      })
    );
  }

  loadStats(): Observable<{ stats: TaskStats }> {
    return this.http.get<{ stats: TaskStats }>(`${this.apiUrl}/stats`).pipe(
      tap(response => this.statsSignal.set(response.stats))
    );
  }

  loadUsers(): Observable<{ users: User[] }> {
    return this.http.get<{ users: User[] }>(`${this.apiUrl}/users`).pipe(
      tap(response => this.usersSignal.set(response.users))
    );
  }

  getTask(id: number): Observable<{ task: Task }> {
    return this.http.get<{ task: Task }>(`${this.apiUrl}/${id}`);
  }

  createTask(data: CreateTaskRequest): Observable<{ task: Task }> {
    // Don't add locally - Socket.IO will broadcast to all users including creator
    return this.http.post<{ task: Task }>(this.apiUrl, data);
  }

  updateTask(id: number, data: UpdateTaskRequest): Observable<{ task: Task }> {
    // Don't update locally - Socket.IO will broadcast to all users
    return this.http.put<{ task: Task }>(`${this.apiUrl}/${id}`, data);
  }

  deleteTask(id: number): Observable<{ message: string }> {
    // Don't remove locally - Socket.IO will broadcast to all users
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  updateTaskInList(task: Task): void {
    this.tasksSignal.update(tasks => {
      const index = tasks.findIndex(t => t.id === task.id);
      if (index >= 0) {
        return tasks.map(t => t.id === task.id ? task : t);
      }
      return [task, ...tasks];
    });
  }

  removeTaskFromList(taskId: number): void {
    this.tasksSignal.update(tasks => tasks.filter(t => t.id !== taskId));
  }
}
