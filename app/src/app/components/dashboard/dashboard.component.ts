import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TaskService, SocketService, NotificationService, AuthService } from '../../services';
import { Task, TaskStatus, User } from '../../models';
import { NavbarComponent } from '../navbar/navbar.component';
import { TaskModalComponent } from '../task-modal/task-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, TaskModalComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h3 class="text-sm font-medium opacity-80">Total Tasks</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().total }}</p>
        </div>
        <div class="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <h3 class="text-sm font-medium opacity-80">Pending</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().pending }}</p>
        </div>
        <div class="card bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <h3 class="text-sm font-medium opacity-80">In Progress</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().inProgress }}</p>
        </div>
        <div class="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <h3 class="text-sm font-medium opacity-80">Completed</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().completed }}</p>
        </div>
      </div>

      <!-- Filters and Actions -->
      <div class="card mb-6">
        <div class="flex flex-wrap gap-4 items-center justify-between">
          <div class="flex flex-wrap gap-4">
            <select
              [(ngModel)]="statusFilter"
              (ngModelChange)="applyFilters()"
              class="input w-auto"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              [(ngModel)]="userFilter"
              (ngModelChange)="applyFilters()"
              class="input w-auto"
            >
              <option value="">All Users</option>
              @for (user of taskService.users(); track user.id) {
                <option [value]="user.id">{{ user.username }}</option>
              }
            </select>
          </div>

          <button (click)="openModal()" class="btn btn-primary">
            + New Task
          </button>
        </div>
      </div>

      <!-- Tasks Table -->
      <div class="card overflow-hidden">
        @if (taskService.loading()) {
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p class="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        } @else if (taskService.tasks().length === 0) {
          <div class="text-center py-8 text-gray-500">
            No tasks found. Create your first task!
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (task of taskService.tasks(); track task.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                      <div class="font-medium text-gray-900">{{ task.title }}</div>
                      @if (task.description) {
                        <div class="text-sm text-gray-500 truncate max-w-xs">{{ task.description }}</div>
                      }
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusBadgeClass(task.status)">
                        {{ task.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">
                      {{ task.assignee?.username || 'Unassigned' }}
                    </td>
                    <td class="px-6 py-4 text-sm" [class.text-red-600]="isOverdue(task)">
                      {{ task.due_date ? (task.due_date | date:'mediumDate') : '-' }}
                      @if (isOverdue(task)) {
                        <span class="text-xs">(Overdue)</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-right space-x-2">
                      <button
                        (click)="viewTaskDetails(task)"
                        class="text-gray-600 hover:text-gray-800"
                      >
                        View
                      </button>
                      <button
                        (click)="openModal(task)"
                        class="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        (click)="deleteTask(task)"
                        class="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Task Details Modal -->
    @if (showDetailsModal && viewTask) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h2 class="text-2xl font-bold text-gray-900">{{ viewTask.title }}</h2>
                <span [class]="getStatusBadgeClass(viewTask.status)" class="mt-2 inline-block">
                  {{ viewTask.status }}
                </span>
              </div>
              <button (click)="closeDetailsModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <!-- Description -->
              <div>
                <h3 class="text-sm font-medium text-gray-500 uppercase">Description</h3>
                <p class="mt-1 text-gray-900">{{ viewTask.description || 'No description provided' }}</p>
              </div>

              <hr class="border-gray-200" />

              <!-- Details Grid -->
              <div class="grid grid-cols-2 gap-4">
                <!-- Due Date -->
                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Due Date</h3>
                  <p class="mt-1 text-gray-900" [class.text-red-600]="isOverdue(viewTask)">
                    {{ viewTask.due_date ? (viewTask.due_date | date:'fullDate') : 'No due date' }}
                    @if (isOverdue(viewTask)) {
                      <span class="text-xs ml-1">(Overdue)</span>
                    }
                  </p>
                </div>

                <!-- Created Date -->
                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Created</h3>
                  <p class="mt-1 text-gray-900">{{ viewTask.createdAt | date:'medium' }}</p>
                </div>

                <!-- Assigned To -->
                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Assigned To</h3>
                  <div class="mt-1">
                    @if (viewTask.assignee) {
                      <p class="text-gray-900 font-medium">{{ viewTask.assignee.username }}</p>
                      <p class="text-sm text-gray-500">{{ viewTask.assignee.email }}</p>
                    } @else {
                      <p class="text-gray-500">Unassigned</p>
                    }
                  </div>
                </div>

                <!-- Created By -->
                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Created By</h3>
                  <div class="mt-1">
                    @if (viewTask.creator) {
                      <p class="text-gray-900 font-medium">{{ viewTask.creator.username }}</p>
                      <p class="text-sm text-gray-500">{{ viewTask.creator.email }}</p>
                    } @else {
                      <p class="text-gray-500">Unknown</p>
                    }
                  </div>
                </div>

                <!-- Last Updated -->
                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Last Updated</h3>
                  <p class="mt-1 text-gray-900">{{ viewTask.updatedAt | date:'medium' }}</p>
                </div>

                <!-- Task ID -->
                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Task ID</h3>
                  <p class="mt-1 text-gray-900">#{{ viewTask.id }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex justify-end space-x-3">
              <button
                (click)="closeDetailsModal()"
                class="btn bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                (click)="closeDetailsModal(); openModal(viewTask)"
                class="btn btn-primary"
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Task Modal -->
    @if (showModal) {
      <app-task-modal
        [task]="selectedTask"
        [users]="taskService.users()"
        (close)="closeModal()"
        (save)="saveTask($event)"
      ></app-task-modal>
    }
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  showModal = false;
  showDetailsModal = false;
  selectedTask: Task | null = null;
  viewTask: Task | null = null;
  statusFilter = '';
  userFilter = '';

  private subscriptions: Subscription[] = [];

  constructor(
    public taskService: TaskService,
    private socketService: SocketService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupSocketListeners();
    this.socketService.connect();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.disconnect();
  }

  loadData(): void {
    this.taskService.loadTasks().subscribe();
    this.taskService.loadStats().subscribe();
    this.taskService.loadUsers().subscribe();
  }

  applyFilters(): void {
    const status = this.statusFilter as TaskStatus | undefined;
    const userId = this.userFilter ? parseInt(this.userFilter) : undefined;
    this.taskService.loadTasks(status || undefined, userId).subscribe();
  }

  openModal(task?: Task): void {
    this.selectedTask = task || null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedTask = null;
  }

  viewTaskDetails(task: Task): void {
    this.viewTask = task;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.viewTask = null;
  }

  saveTask(data: any): void {
    if (this.selectedTask) {
      this.taskService.updateTask(this.selectedTask.id, data).subscribe({
        next: () => {
          this.notificationService.success('Task updated successfully');
          this.closeModal();
          this.taskService.loadStats().subscribe();
        },
        error: (err) => {
          this.notificationService.error(err.error?.error || 'Failed to update task');
        }
      });
    } else {
      this.taskService.createTask(data).subscribe({
        next: () => {
          this.notificationService.success('Task created successfully');
          this.closeModal();
          this.taskService.loadStats().subscribe();
        },
        error: (err) => {
          this.notificationService.error(err.error?.error || 'Failed to create task');
        }
      });
    }
  }

  deleteTask(task: Task): void {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskService.deleteTask(task.id).subscribe({
        next: () => {
          this.notificationService.success('Task deleted successfully');
          this.taskService.loadStats().subscribe();
        },
        error: (err) => {
          this.notificationService.error(err.error?.error || 'Failed to delete task');
        }
      });
    }
  }

  getStatusBadgeClass(status: TaskStatus): string {
    const base = 'badge';
    switch (status) {
      case 'Pending':
        return `${base} badge-pending`;
      case 'In Progress':
        return `${base} badge-in-progress`;
      case 'Completed':
        return `${base} badge-completed`;
      default:
        return base;
    }
  }

  isOverdue(task: Task): boolean {
    if (!task.due_date || task.status === 'Completed') return false;
    return new Date(task.due_date) < new Date();
  }

  private setupSocketListeners(): void {
    const notificationSub = this.socketService.notifications$.subscribe(notification => {
      this.notificationService.info(notification.message);
    });

    const taskUpdateSub = this.socketService.taskUpdates$.subscribe(update => {
      if (update.action === 'created' || update.action === 'updated') {
        if (update.task) {
          this.taskService.updateTaskInList(update.task);
        }
      } else if (update.action === 'deleted' && update.taskId) {
        this.taskService.removeTaskFromList(update.taskId);
      }
      this.taskService.loadStats().subscribe();
    });

    this.subscriptions.push(notificationSub, taskUpdateSub);
  }
}
