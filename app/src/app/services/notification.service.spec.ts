import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });

    service = TestBed.inject(NotificationService);
  });

  describe('show', () => {
    it('should add a notification', () => {
      service.show('Test message', 'info');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test message');
      expect(notifications[0].type).toBe('info');
    });

    it('should auto-remove notification after 5 seconds', fakeAsync(() => {
      service.show('Test message', 'info');
      expect(service.notifications()).toHaveLength(1);

      tick(5000);
      expect(service.notifications()).toHaveLength(0);
    }));

    it('should assign unique ids to notifications', () => {
      service.show('Message 1', 'info');
      service.show('Message 2', 'info');

      const notifications = service.notifications();
      expect(notifications[0].id).not.toBe(notifications[1].id);
    });
  });

  describe('success', () => {
    it('should add a success notification', () => {
      service.success('Success message');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Success message');
    });
  });

  describe('error', () => {
    it('should add an error notification', () => {
      service.error('Error message');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Error message');
    });
  });

  describe('info', () => {
    it('should add an info notification', () => {
      service.info('Info message');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('info');
      expect(notifications[0].message).toBe('Info message');
    });
  });

  describe('remove', () => {
    it('should remove notification by id', () => {
      service.show('Message 1', 'info');
      service.show('Message 2', 'info');

      const notifications = service.notifications();
      const firstId = notifications[0].id;

      service.remove(firstId);

      expect(service.notifications()).toHaveLength(1);
      expect(service.notifications()[0].message).toBe('Message 2');
    });

    it('should do nothing if id not found', () => {
      service.show('Message', 'info');
      service.remove(99999);

      expect(service.notifications()).toHaveLength(1);
    });
  });

  describe('multiple notifications', () => {
    it('should handle multiple notifications', () => {
      service.success('Success');
      service.error('Error');
      service.info('Info');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(3);
    });

    it('should maintain order (newest last)', () => {
      service.show('First', 'info');
      service.show('Second', 'info');
      service.show('Third', 'info');

      const notifications = service.notifications();
      expect(notifications[0].message).toBe('First');
      expect(notifications[1].message).toBe('Second');
      expect(notifications[2].message).toBe('Third');
    });
  });
});
