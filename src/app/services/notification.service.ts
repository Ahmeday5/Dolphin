import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private hubConnection!: signalR.HubConnection;
  private orderNotificationSubject = new BehaviorSubject<any>(null);
  orderNotification$ = this.orderNotificationSubject.asObservable();

  constructor(private authService: AuthService) {}

  async startConnection(): Promise<void> {
    const token = this.authService.getToken();
    if (!token) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://78.89.159.126:9393/PharmacyDolphenAPI/hubs/notification', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on(
      'ReceiveOrderNotification',
      (order: any) => {
        this.orderNotificationSubject.next(order);
      }
    );

    await this.hubConnection.start();
  }

  joinDeliveryManGroup(deliveryManId: number): void {
    this.hubConnection
      .invoke('JoinDeliveryManGroup', deliveryManId)
      .catch((err: any) => console.error(err));
  }

  stopConnection(): void {
    this.hubConnection
      ?.stop()
      .catch((err: any) => console.error(err));
  }
}
