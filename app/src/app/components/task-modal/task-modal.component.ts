import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task, TaskStatus, User, CreateTaskRequest, UpdateTaskRequest } from '../../models';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div class="flex justify-between items-center px-6 py-4 border-b">
          <h3 class="text-lg font-semibold text-gray-800">
            {{ task ? 'Edit Task' : 'Create Task' }}
          </h3>
          <button (click)="close.emit()" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6">
          <div class="mb-4">
            <label class="label" for="title">Title</label>
            <input
              type="text"
              id="title"
              formControlName="title"
              class="input"
              placeholder="Task title"
            />
            @if (form.get('title')?.touched && form.get('title')?.invalid) {
              <p class="text-red-500 text-sm mt-1">Title is required</p>
            }
          </div>

          <div class="mb-4">
            <label class="label" for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              class="input min-h-[100px]"
              placeholder="Task description"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="label" for="status">Status</label>
              <select id="status" formControlName="status" class="input">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label class="label" for="due_date">Due Date</label>
              <input
                type="date"
                id="due_date"
                formControlName="due_date"
                class="input"
              />
            </div>
          </div>

          <div class="mb-6">
            <label class="label">Assign To</label>
            <div class="border border-gray-300 rounded-md max-h-40 overflow-y-auto p-2 bg-white">
              @if (users.length === 0) {
                <p class="text-gray-500 text-sm py-2 text-center">No team members available</p>
              }
              @for (user of users; track user.id) {
                <label class="flex items-center py-1.5 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    [checked]="isUserAssigned(user.id)"
                    (change)="toggleAssignee(user.id, $event)"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">{{ getUserDisplayName(user) }}</span>
                </label>
              }
            </div>
            @if (selectedAssignees.length > 0) {
              <p class="text-xs text-gray-500 mt-1">{{ selectedAssignees.length }} user(s) selected</p>
            }
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" (click)="close.emit()" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" [disabled]="form.invalid || loading" class="btn btn-primary">
              {{ loading ? 'Saving...' : (task ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class TaskModalComponent implements OnInit {
  @Input() task: Task | null = null;
  @Input() users: User[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<CreateTaskRequest | UpdateTaskRequest>();

  form!: FormGroup;
  loading = false;
  selectedAssignees: number[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Initialize selected assignees from existing task
    if (this.task?.assignees) {
      this.selectedAssignees = this.task.assignees.map(u => u.id);
    }

    this.form = this.fb.group({
      title: [this.task?.title || '', Validators.required],
      description: [this.task?.description || ''],
      status: [this.task?.status || 'Pending'],
      due_date: [this.task?.due_date ? this.formatDate(this.task.due_date) : '']
    });
  }

  isUserAssigned(userId: number): boolean {
    return this.selectedAssignees.includes(userId);
  }

  toggleAssignee(userId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedAssignees.includes(userId)) {
        this.selectedAssignees.push(userId);
      }
    } else {
      this.selectedAssignees = this.selectedAssignees.filter(id => id !== userId);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const data: CreateTaskRequest | UpdateTaskRequest = {
      ...this.form.value,
      assigned_to: this.selectedAssignees.length > 0 ? this.selectedAssignees : undefined
    };

    if (!data.due_date) delete data.due_date;

    this.save.emit(data);
  }

  private formatDate(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  getUserDisplayName(user: User): string {
    return user.full_name || `${user.first_name} ${user.last_name}`;
  }
}
