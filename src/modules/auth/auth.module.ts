import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalCustomerStrategy } from './strategies/local-customer.strategy';
import { LocalEmployeeStrategy } from './strategies/local-employee.strategy';
import { UsersModule } from '../users/users.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret', 'fallback_secret'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '5h') as any },
      }),
    }),
    UsersModule,
    EmployeesModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalCustomerStrategy, LocalEmployeeStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
