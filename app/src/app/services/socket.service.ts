import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Task, TaskNotification } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  private notificationSubject = new Subject<TaskNotification>();
  private taskUpdateSubject = new Subject<{ action: string; task?: Task; taskId?: number }>();

  readonly notifications$: Observable<TaskNotification> = this.notificationSubject.asObservable();
  readonly taskUpdates$: Observable<{ action: string; task?: Task; taskId?: number }> = this.taskUpdateSubject.asObservable();

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getToken();
    if (!token || this.socket?.connected) return;

    const socketUrl = environment.socketUrl || window.location.origin;

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('notification', (data: TaskNotification) => {
      this.notificationSubject.next(data);
    });

    this.socket.on('task_update', (data: { action: string; task?: Task; taskId?: number }) => {
      this.taskUpdateSubject.next(data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.notificationSubject.complete();
    this.taskUpdateSubject.complete();
  }
}
